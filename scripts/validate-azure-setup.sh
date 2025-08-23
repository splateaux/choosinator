#!/bin/bash

# Validate Azure Migration Setup
# This script checks if all required tools and dependencies are installed

set -e

echo "🔍 Validating Azure Migration Setup..."

# Check Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    docker --version
else
    echo "❌ Docker is not installed"
    exit 1
fi

# Check Docker Compose
if command -v docker compose &> /dev/null; then
    echo "✅ Docker Compose is installed"
    docker compose --version
else
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Check .NET 8
if command -v dotnet &> /dev/null; then
    DOTNET_VERSION=$(dotnet --version)
    if [[ "$DOTNET_VERSION" == 8.* ]]; then
        echo "✅ .NET 8 is installed: $DOTNET_VERSION"
    else
        echo "❌ .NET 8 is required, found: $DOTNET_VERSION"
        exit 1
    fi
else
    echo "❌ .NET is not installed"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js is installed: $NODE_VERSION"
else
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check Azure Functions Core Tools
if command -v func &> /dev/null; then
    FUNC_VERSION=$(func --version)
    echo "✅ Azure Functions Core Tools is installed: $FUNC_VERSION"
else
    echo "❌ Azure Functions Core Tools is not installed"
    echo "💡 Install with: npm install -g azure-functions-core-tools@4"
    exit 1
fi

# Check if ports are available
echo "🔍 Checking port availability..."

PORTS=(8081 10000 10001 10002 7071)
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
    else
        echo "✅ Port $port is available"
    fi
done

# Check if required files exist
echo "🔍 Checking required files..."

REQUIRED_FILES=(
    "docker-compose.yml"
    "azure.env.template"
    "functions/ChoosinatorFunctions.csproj"
    "scripts/dev-azure.sh"
    "scripts/stop-azure.sh"
    "scripts/test-azure-functions.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

echo ""
echo "🎉 Azure Migration setup validation passed!"
echo ""
echo "Next steps:"
echo "1. Run: make -f Makefile.azure start"
echo "2. Run: ./scripts/dev-azure.sh"
echo "3. Test with: ./scripts/test-azure-functions.sh"
echo ""
echo "For help: make -f Makefile.azure help"

