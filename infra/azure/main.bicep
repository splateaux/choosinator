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