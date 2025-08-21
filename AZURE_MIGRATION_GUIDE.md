# Azure Migration Guide for Choosinator

## Overview

Migrate Choosinator from **AWS (Lambda + DynamoDB + API Gateway WebSockets)** to **Azure (Functions + Cosmos DB + Web PubSub)** while keeping the **Remix (JS/TS) frontend** intact.  
Goals: real-time, cost-aware, minimal DevOps, and **strong local parity**.

## Migration Strategy

- **Frontend**: Keep Remix + React + TypeScript (SSR/UI unchanged)
- **Backend**: Move write paths + realtime to **Azure Functions (.NET 8 isolated)**
- **Database**: DynamoDB → **Cosmos DB (SQL API, Serverless/Autoscale)**
- **Realtime**: API GW WebSockets → **Azure Web PubSub**
- **Infra**: **azd (Azure Developer CLI)** + **Bicep**; GitHub Actions with **OIDC**

## Phase 1: Setup & Infrastructure (Week 1)

### Step 1.1: Branch & Tooling

```bash
git checkout -b azure-migration
git push -u origin azure-migration

# Install Azure Developer CLI
curl -fsSL https://aka.ms/install-azd.sh | bash
azd version

# Auth
azd auth login
```

### Step 1.2: Project Layout (Azure bits isolated)

```bash
# Create Azure infrastructure directory
mkdir -p infra/azure
mkdir -p functions
mkdir -p .github/workflows

# Your existing structure remains:
# app/          (Remix frontend - unchanged)
# tests/        (existing tests)
# package.json  (existing dependencies)
```

### Step 1.3: Create Azure Infrastructure (Bicep)

Create `infra/azure/main.bicep`:

```bicep
@description('Environment name (dev, staging, prod)')
param environment string

@description('Application name')
param appName string = 'choosinator'

@description('Location for resources')
param location string = resourceGroup().location

// Resource naming
var resourcePrefix = '${appName}-${environment}'

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${resourcePrefix}-plan'
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
}

// Storage Account for Functions
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: '${replace(resourcePrefix, '-', '')}st'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

// Cosmos DB
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: '${resourcePrefix}-cosmos'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosAccount
  name: 'choosinator'
}

resource pollVoteContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'pollVote'
  properties: {
    resource: {
      id: 'pollVote'
      partitionKey: {
        paths: ['/pollId']
        kind: 'Hash'
      }
    }
  }
}

resource pollContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'poll'
  properties: {
    resource: {
      id: 'poll'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource optionsListContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'optionsList'
  properties: {
    resource: {
      id: 'optionsList'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}

resource userContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'user'
  properties: {
    resource: {
      id: 'user'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

// Web PubSub
resource webPubSub 'Microsoft.SignalRService/webPubSub@2023-06-01-preview' = {
  name: '${resourcePrefix}-pubsub'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
    capacity: 1
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: '${resourcePrefix}-functions'
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: storageAccount.properties.primaryEndpoints.blob
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet-isolated'
        }
        {
          name: 'COSMOS_CONNECTION_STRING'
          value: cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
        }
        {
          name: 'WEBPUBSUB_CONNECTION_STRING'
          value: webPubSub.listKeys().primaryConnectionString
        }
      ]
    }
  }
}

// App Service for Remix
resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: '${resourcePrefix}-web'
  location: location
  kind: 'app'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'API_BASE_URL'
          value: 'https://${functionApp.properties.defaultHostName}'
        }
      ]
    }
  }
}

// Outputs
output functionAppName string = functionApp.name
output webAppName string = webApp.name
output cosmosConnectionString string = cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
output webPubSubConnectionString string = webPubSub.listKeys().primaryConnectionString
```

### Step 1.4: Create Azure Developer CLI Config

Create `azure.yaml`:

```yaml
name: choosinator
metadata:
  template: choosinator
services:
  web:
    project: app
    language: node
    host: appservice
  api:
    project: functions
    language: dotnet
    host: function
infrastructure:
  provider: bicep
  path: infra/azure
```

## Phase 2: C# Functions Development (Week 2)

### Step 2.1: Create .NET Functions Project

```bash
cd functions
dotnet new isolated-functionapp -n ChoosinatorFunctions
cd ChoosinatorFunctions
dotnet add package Microsoft.Azure.WebJobs.Extensions.CosmosDB
dotnet add package Microsoft.Azure.WebJobs.Extensions.SignalRService
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Http
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Timer
```

### Step 2.2: Implement Negotiate Function

Create `Functions/NegotiateFunction.cs`:

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.WebJobs.Extensions.SignalRService;
using System.Net;
using System.Text.Json;

namespace ChoosinatorFunctions.Functions
{
    public class NegotiateFunction
    {
        [Function("Negotiate")]
        public static SignalRConnectionInfo Negotiate(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "negotiate")] HttpRequestData req,
            [SignalRConnectionInfoInput(HubName = "choosinator")] SignalRConnectionInfo connectionInfo)
        {
            // Read pollId and userId from request
            var requestBody = JsonSerializer.Deserialize<NegotiateRequest>(req.Body);

            // Return connection info with group assignment
            return new SignalRConnectionInfo
            {
                Url = connectionInfo.Url,
                AccessToken = connectionInfo.AccessToken,
                GroupName = $"poll:{requestBody.PollId}"
            };
        }
    }

    public class NegotiateRequest
    {
        public string PollId { get; set; }
        public string UserId { get; set; }
    }
}
```

### Step 2.3: Implement Vote Function

Create `Functions/VoteFunction.cs`:

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.WebJobs.Extensions.CosmosDB;
using Microsoft.Azure.Cosmos;
using System.Net;
using System.Text.Json;

namespace ChoosinatorFunctions.Functions
{
    public class VoteFunction
    {
        [Function("Vote")]
        public static async Task<HttpResponseData> Vote(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "vote")] HttpRequestData req,
            [CosmosDBInput("choosinator", "pollVote", ConnectionStringSetting = "COSMOS_CONNECTION_STRING")]
            CosmosClient cosmosClient)
        {
            var requestBody = JsonSerializer.Deserialize<VoteRequest>(req.Body);

            // Validate token limit (≤10 per user)
            var container = cosmosClient.GetContainer("choosinator", "pollVote");

            // Get current user votes for this poll
            var query = container.GetItemQueryIterator<VoteRecord>(
                new QueryDefinition("SELECT * FROM c WHERE c.pollId = @pollId AND c.userId = @userId")
                    .WithParameter("@pollId", requestBody.PollId)
                    .WithParameter("@userId", requestBody.UserId)
            );

            var totalTokens = 0;
            while (query.HasMoreResults)
            {
                var response = await query.ReadNextAsync();
                totalTokens += response.Sum(v => v.Tokens);
            }

            if (totalTokens + requestBody.Tokens > 10)
            {
                var response = req.CreateResponse(HttpStatusCode.BadRequest);
                response.WriteString("Token limit exceeded");
                return response;
            }

            // Write vote to Cosmos DB
            var voteRecord = new VoteRecord
            {
                Id = $"{requestBody.PollId}:{requestBody.UserId}:{requestBody.OptionId}",
                PollId = requestBody.PollId,
                UserId = requestBody.UserId,
                OptionId = requestBody.OptionId,
                Tokens = requestBody.Tokens,
                UpdatedAt = DateTime.UtcNow
            };

            await container.UpsertItemAsync(voteRecord);

            var successResponse = req.CreateResponse(HttpStatusCode.OK);
            successResponse.WriteString("Vote recorded successfully");
            return successResponse;
        }
    }

    public class VoteRequest
    {
        public string PollId { get; set; }
        public string UserId { get; set; }
        public string OptionId { get; set; }
        public int Tokens { get; set; }
    }

    public class VoteRecord
    {
        public string Id { get; set; }
        public string PollId { get; set; }
        public string UserId { get; set; }
        public string OptionId { get; set; }
        public int Tokens { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
```

### Step 2.4: Implement Change Feed Function

Create `Functions/VoteChangeFeedFunction.cs`:

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.WebJobs.Extensions.CosmosDB;
using Microsoft.Azure.WebJobs.Extensions.SignalRService;
using System.Text.Json;

namespace ChoosinatorFunctions.Functions
{
    public class VoteChangeFeedFunction
    {
        [Function("VoteChangeFeed")]
        public static async Task Run(
            [CosmosDBTrigger(
                databaseName: "choosinator",
                collectionName: "pollVote",
                ConnectionStringSetting = "COSMOS_CONNECTION_STRING",
                LeaseCollectionName = "leases")]
            IReadOnlyList<Microsoft.Azure.Documents.Document> input,
            [SignalR(HubName = "choosinator")] IAsyncCollector<SignalRMessage> signalRMessages)
        {
            if (input != null && input.Count > 0)
            {
                // Group changes by pollId for efficient broadcasting
                var changesByPoll = input
                    .Select(doc => JsonSerializer.Deserialize<VoteRecord>(doc.ToString()))
                    .GroupBy(v => v.PollId);

                foreach (var pollGroup in changesByPoll)
                {
                    var message = new SignalRMessage
                    {
                        Target = "voteUpdated",
                        Arguments = new object[]
                        {
                            new
                            {
                                pollId = pollGroup.Key,
                                changes = pollGroup.Select(v => new
                                {
                                    optionId = v.OptionId,
                                    userId = v.UserId,
                                    tokens = v.Tokens,
                                    updatedAt = v.UpdatedAt
                                }).ToArray()
                            }
                        },
                        GroupName = $"poll:{pollGroup.Key}"
                    };

                    await signalRMessages.AddAsync(message);
                }
            }
        }
    }
}
```

### Step 2.5: Implement Presence Function

Create `Functions/PresenceFunction.cs`:

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.WebJobs.Extensions.CosmosDB;
using Microsoft.Azure.Cosmos;
using System.Net;
using System.Text.Json;

namespace ChoosinatorFunctions.Functions
{
    public class PresenceFunction
    {
        [Function("Presence")]
        public static async Task<HttpResponseData> UpdatePresence(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "presence")] HttpRequestData req,
            [CosmosDBInput("choosinator", "pollPresence", ConnectionStringSetting = "COSMOS_CONNECTION_STRING")]
            CosmosClient cosmosClient)
        {
            var requestBody = JsonSerializer.Deserialize<PresenceRequest>(req.Body);

            var container = cosmosClient.GetContainer("choosinator", "pollPresence");

            var presenceRecord = new PresenceRecord
            {
                Id = $"{requestBody.PollId}:{requestBody.ClientId}",
                PollId = requestBody.PollId,
                ClientId = requestBody.ClientId,
                DisplayName = requestBody.DisplayName,
                LastSeenAt = DateTime.UtcNow,
                TTL = DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeSeconds()
            };

            await container.UpsertItemAsync(presenceRecord);

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.WriteString("Presence updated");
            return response;
        }
    }

    public class PresenceRequest
    {
        public string PollId { get; set; }
        public string ClientId { get; set; }
        public string DisplayName { get; set; }
    }

    public class PresenceRecord
    {
        public string Id { get; set; }
        public string PollId { get; set; }
        public string ClientId { get; set; }
        public string DisplayName { get; set; }
        public DateTime LastSeenAt { get; set; }
        public long TTL { get; set; }
    }
}
```

## Phase 3: Frontend Integration (Week 3)

### Step 3.1: Update Remix Environment Configuration

Create `app/config/azure.server.ts`:

```typescript
export const azureConfig = {
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:7071",
  webPubSubUrl: process.env.WEBPUBSUB_URL || "ws://localhost:8080",
};

export function getApiEndpoint(path: string): string {
  return `${azureConfig.apiBaseUrl}/api${path}`;
}
```

### Step 3.2: Update Vote Action to Use Azure API

Modify `app/routes/polls.$pollId.tsx`:

```typescript
// Replace existing vote action with Azure API call
if (intent === "vote.adjust") {
  const pollId = formData.get("pollId") as string;
  const optionId = formData.get("optionId") as string;
  const delta = Number(formData.get("delta"));
  const userId =
    (await getUserId(request)) ?? `session#${(await getSession(request)).id}`;

  // Call Azure Function instead of local action
  const response = await fetch(`${getApiEndpoint("/vote")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pollId,
      userId,
      optionId,
      tokens: delta,
    }),
  });

  if (response.ok) {
    return json({ ok: true });
  } else {
    return json({ error: "Vote failed" }, { status: 400 });
  }
}
```

### Step 3.3: Update WebSocket Connection for Azure Web PubSub

Modify WebSocket connection in `app/routes/polls.$pollId.tsx`:

```typescript
// Replace WebSocket connection with Azure Web PubSub
useEffect(() => {
  const connectToAzurePubSub = async () => {
    try {
      // Get connection info from Azure Function
      const response = await fetch(`${getApiEndpoint("/negotiate")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: data.poll.id,
          userId: data.voterId,
        }),
      });

      const connectionInfo = await response.json();

      // Connect to Azure Web PubSub
      const ws = new WebSocket(connectionInfo.url);

      ws.onopen = () => {
        console.log("🔌 [AZURE-WS] Connected to Azure Web PubSub");
        // Join the poll group
        ws.send(
          JSON.stringify({
            type: "joinGroup",
            group: `poll:${data.poll.id}`,
          }),
        );
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.target === "voteUpdated") {
          // Handle vote updates
          const { pollId, changes } = msg.arguments[0];
          if (pollId === data.poll.id) {
            // Update UI with changes
            revalidateRef.current();
          }
        }
      };

      return () => ws.close();
    } catch (error) {
      console.error("Failed to connect to Azure Web PubSub:", error);
    }
  };

  connectToAzurePubSub();
}, [data.poll.id, data.voterId]);
```

### Step 3.4: Update Presence Tracking

Modify presence handling in `app/routes/polls.$pollId.tsx`:

```typescript
// Update presence endpoint to use Azure
const presenceFetcher = useFetcher<{
  participants: { clientId: string; displayName: string }[];
}>();

// In the presence effect
useEffect(() => {
  const pollId = data.poll.id;

  const updatePresence = async () => {
    const formData = new FormData();
    formData.append("pollId", pollId);
    formData.append("clientId", data.voterId);
    formData.append("displayName", data.guestName || data.userId || "Guest");

    await fetch(`${getApiEndpoint("/presence")}`, {
      method: "POST",
      body: formData,
    });
  };

  // Initial presence update
  updatePresence();

  // Heartbeat every 30 seconds (reduced from 10)
  const heartbeat = setInterval(updatePresence, 30000);

  return () => clearInterval(heartbeat);
}, [data.poll.id, data.voterId, data.guestName, data.userId]);
```

## Phase 4: GitHub Actions & Deployment (Week 4)

### Step 4.1: Create Azure Infrastructure Workflow

Create `.github/workflows/infra-azure.yml`:

```yaml
name: Azure Infrastructure
on:
  workflow_dispatch:
  push:
    branches: [azure-migration]
    paths: ["infra/azure/**", "azure.yaml"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: azure-dev
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Install azd
        run: curl -fsSL https://aka.ms/install-azd.sh | bash

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy Infrastructure
        run: azd up --no-prompt --environment azure-dev
```

### Step 4.2: Create Azure Functions Workflow

Create `.github/workflows/functions-azure.yml`:

```yaml
name: Azure Functions
on:
  push:
    branches: [azure-migration]
    paths: ["functions/**"]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    environment: azure-dev

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "8.0.x"

      - name: Build Functions
        run: |
          cd functions/ChoosinatorFunctions
          dotnet build -c Release
          dotnet test -c Release --no-build

      - name: Publish Functions
        run: |
          cd functions/ChoosinatorFunctions
          dotnet publish -c Release -o ./publish

      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: ${{ vars.AZURE_FUNCTION_APP_NAME }}
          package: ./functions/ChoosinatorFunctions/publish
```

### Step 4.3: Create Frontend Workflow

Create `.github/workflows/frontend-azure.yml`:

```yaml
name: Frontend (Azure)
on:
  push:
    branches: [azure-migration]
    paths: ["app/**", "remix.config.*", "package*.json"]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    environment: azure-dev

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ vars.AZURE_WEB_APP_NAME }}
          package: ./build
```

## Phase 5: Testing & Validation (Week 5)

### Step 5.1: Local Development Setup

```bash
# Start Cosmos DB Emulator
docker run -p 8081:8081 -p 10251:10251 -p 10252:10252 -p 10253:10253 -p 10254:10254 \
  -e AZURE_COSMOS_EMULATOR_PARTITION_COUNT=10 \
  -e AZURE_COSMOS_EMULATOR_IP_ADDRESS_OVERRIDE=127.0.0.1 \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:latest

# Start Azure Functions locally
cd functions/ChoosinatorFunctions
func start

# Start Web PubSub local tunnel
az webpubsub start --name choosinator-dev --resource-group rg-choosinator-azure-dev
```

### Step 5.2: Environment Configuration

Create `.env.azure`:

```bash
# Azure Development Environment
API_BASE_URL=http://localhost:7071
WEBPUBSUB_URL=ws://localhost:8080
COSMOS_CONNECTION_STRING=AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
```

### Step 5.3: Test Azure Functions Locally

```bash
# Test negotiate endpoint
curl -X POST http://localhost:7071/api/negotiate \
  -H "Content-Type: application/json" \
  -d '{"pollId":"test-poll","userId":"test-user"}'

# Test vote endpoint
curl -X POST http://localhost:7071/api/vote \
  -H "Content-Type: application/json" \
  -d '{"pollId":"test-poll","userId":"test-user","optionId":"option1","tokens":5}'
```

## Phase 6: Migration & Cutover (Week 6)

### Step 6.1: Data Migration Strategy

```bash
# Export data from DynamoDB
aws dynamodb scan --table-name pollVote --output json > pollVote-export.json

# Create migration script in functions project
dotnet run --project functions/ChoosinatorFunctions -- migrate-data pollVote-export.json
```

### Step 6.2: Feature Flag Implementation

Add to `app/config/features.server.ts`:

```typescript
export const features = {
  useAzureBackend: process.env.USE_AZURE_BACKEND === "true",
  azureApiUrl: process.env.API_BASE_URL,
  awsApiUrl: process.env.AWS_API_URL || "http://localhost:3000",
};
```

### Step 6.3: Gradual Rollout

```typescript
// In vote action
if (features.useAzureBackend) {
  // Use Azure Functions
  return await callAzureVoteAPI(formData);
} else {
  // Use existing AWS logic
  return await callAwsVoteAPI(formData);
}
```

## Required GitHub Secrets

Set these in your GitHub repository secrets:

```bash
AZURE_CLIENT_ID=your-azure-app-registration-client-id
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_SUBSCRIPTION_ID=your-azure-subscription-id
```

## Required GitHub Variables

Set these in your GitHub repository variables:

```bash
AZURE_FUNCTION_APP_NAME=choosinator-azure-dev-functions
AZURE_WEB_APP_NAME=choosinator-azure-dev-web
AZ_ENV=azure-dev
```

## Migration Checklist

- [ ] **Week 1**: Azure infrastructure setup, Bicep templates
- [ ] **Week 2**: C# Functions development (negotiate, vote, change feed, presence)
- [ ] **Week 3**: Frontend integration, WebSocket migration, presence updates
- [ ] **Week 4**: GitHub Actions workflows, CI/CD setup
- [ ] **Week 5**: Local testing, Cosmos emulator, validation
- [ ] **Week 6**: Data migration, feature flags, cutover

## Key Benefits of This Migration

1. **Incremental Migration**: Keep AWS running while building Azure
2. **Zero Downtime**: Feature flags allow gradual rollout
3. **Local Development Parity**: Cosmos emulator + local Functions
4. **Cost Optimization**: Better .NET performance, simplified architecture
5. **GitHub Integration**: Keep existing workflow, add Azure-specific actions
6. **Better Tooling**: .NET debugging, Visual Studio integration
7. **Simplified Real-time**: Web PubSub vs complex WebSocket + EventBridge setup

## Troubleshooting

### Common Issues

1. **Cosmos DB Connection**: Ensure connection string is correct and includes database name
2. **Function App Deployment**: Check that .NET version matches Azure Functions runtime
3. **Web PubSub Groups**: Verify group naming convention (`poll:{pollId}`)
4. **Local Development**: Ensure all services (Cosmos emulator, Functions, Web PubSub) are running

### Debug Commands

```bash
# Check Azure Functions logs
func azure functionapp logstream choosinator-azure-dev-functions

# Check Cosmos DB metrics
az cosmosdb show --name choosinator-azure-dev-cosmos --resource-group rg-choosinator-azure-dev

# Check Web PubSub connections
az webpubsub show --name choosinator-azure-dev-pubsub --resource-group rg-choosinator-azure-dev
```

## Next Steps After Migration

1. **Performance Monitoring**: Set up Azure Application Insights
2. **Cost Optimization**: Monitor Cosmos DB RU usage and optimize queries
3. **Security**: Implement Azure AD B2C for authentication
4. **Scaling**: Configure auto-scaling for Functions and App Service
5. **Backup**: Set up automated backups for Cosmos DB

This migration guide provides a complete path to Azure while maintaining your existing Remix frontend and allowing for thorough testing before cutover.
