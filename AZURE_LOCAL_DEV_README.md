# Azure Migration Local Development

This document explains how to set up and use the local development environment for the Azure migration.

## Prerequisites

- Docker and Docker Compose
- .NET 8 SDK
- Node.js 18+
- Azure Functions Core Tools v4

## Quick Start

### 1. Start Infrastructure Services

```bash
# Start Cosmos DB emulator and Azurite storage
docker-compose up -d

# Check status
docker-compose ps
```

### 2. Start Azure Functions

```bash
# Use the development script (recommended)
./scripts/dev-azure.sh

# Or manually:
cd functions
export AzureWebJobsStorage="UseDevelopmentStorage=true"
export FUNCTIONS_WORKER_RUNTIME="dotnet-isolated"
export COSMOS_CONNECTION_STRING="AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="
export WEBPUBSUB_CONNECTION_STRING="Endpoint=https://localhost:8080;AccessKey=dummy-key;Version=1.0;"

func start --host 0.0.0.0 --port 7071 --cors "*"
```

### 3. Test the Setup

```bash
# Test all Azure Functions endpoints
./scripts/test-azure-functions.sh
```

## Services

### Cosmos DB Emulator

- **Port**: 8081 (HTTPS)
- **Connection String**: See `azure.env.template`
- **Data Explorer**: https://localhost:8081/\_explorer/index.html

### Azurite Storage Emulator

- **Blob**: http://localhost:10000
- **Queue**: http://localhost:10001
- **Table**: http://localhost:10002

### Azure Functions

- **Port**: 7071
- **Local URL**: http://localhost:7071

## Environment Configuration

Copy `azure.env.template` to `.env.azure` and update values as needed:

```bash
cp azure.env.template .env.azure
```

## Development Workflow

1. **Start services**: `docker-compose up -d`
2. **Start Functions**: `./scripts/dev-azure.sh`
3. **Make changes**: Edit code in `functions/` directory
4. **Test changes**: `./scripts/test-azure-functions.sh`
5. **Stop services**: `./scripts/stop-azure.sh`

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8081, 10000-10002, and 7071 are available
2. **Cosmos DB not ready**: Wait for health check to pass (check `docker-compose ps`)
3. **Functions won't start**: Check environment variables and .NET version

### Debug Commands

```bash
# Check service logs
docker-compose logs cosmos-emulator
docker-compose logs azurite

# Check Functions logs
cd functions
func start --verbose

# Test individual endpoints
curl -X POST http://localhost:7071/api/negotiate \
  -H "Content-Type: application/json" \
  -d '{"pollId":"test","userId":"test"}'
```

### Reset Environment

```bash
# Stop and clean everything
./scripts/stop-azure.sh --clean

# Restart fresh
docker-compose up -d
./scripts/dev-azure.sh
```

## Next Steps

After local development is working:

1. Test with the Remix frontend
2. Implement Web PubSub integration
3. Set up CI/CD pipelines
4. Deploy to Azure staging environment

## Notes

- The Cosmos DB emulator uses HTTPS with a self-signed certificate
- Azurite provides local Azure Storage emulation
- Functions run in isolated .NET 8 runtime
- All services are containerized for consistent development experience
