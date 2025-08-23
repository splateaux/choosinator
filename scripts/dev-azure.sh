#!/bin/bash

# Azure Migration Local Development Script
# This script sets up the local development environment for Azure migration

set -e

echo "🚀 Starting Azure Migration Local Development Environment..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .NET 8 is available
if ! command -v dotnet &> /dev/null; then
    echo "❌ .NET 8 is not installed. Please install .NET 8 SDK first."
    exit 1
fi

# Check if Azure Functions Core Tools is available
if ! command -v func &> /dev/null; then
    echo "❌ Azure Functions Core Tools is not installed. Installing..."
    npm install -g azure-functions-core-tools@4 --unsafe-perm true
fi

# Start the infrastructure services
echo "📦 Starting infrastructure services (Cosmos DB, Azurite)..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Failed to start infrastructure services"
    docker-compose logs
    exit 1
fi

echo "✅ Infrastructure services are running!"

# Create .env.azure file if it doesn't exist
if [ ! -f .env.azure ]; then
    echo "📝 Creating .env.azure file..."
    cat > .env.azure << EOF
# Azure Development Environment
API_BASE_URL=http://localhost:7071
WEBPUBSUB_URL=ws://localhost:8080
COSMOS_CONNECTION_STRING=AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1;QueueEndpoint=http://localhost:10001/devstoreaccount1;TableEndpoint=http://localhost:10002/devstoreaccount1;
EOF
fi

# Build and start Azure Functions
echo "🔨 Building Azure Functions..."
cd functions
dotnet restore
dotnet build

echo "🚀 Starting Azure Functions..."
export AzureWebJobsStorage="UseDevelopmentStorage=true"
export FUNCTIONS_WORKER_RUNTIME="dotnet-isolated"
export COSMOS_CONNECTION_STRING="AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="
export WEBPUBSUB_CONNECTION_STRING="Endpoint=https://localhost:8080;AccessKey=dummy-key;Version=1.0;"

func start --host 0.0.0.0 --port 7071 --cors "*"

