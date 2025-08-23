#!/bin/bash

# Stop Azure Migration Local Development Environment

echo "🛑 Stopping Azure Migration Local Development Environment..."

# Stop infrastructure services
echo "📦 Stopping infrastructure services..."
docker-compose down

# Remove volumes if requested
if [ "$1" = "--clean" ]; then
    echo "🧹 Cleaning up volumes..."
    docker-compose down -v
    echo "✅ Volumes cleaned up!"
fi

echo "✅ Azure development environment stopped!"

