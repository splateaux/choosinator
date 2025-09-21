#!/bin/bash

# Automatic development environment setup script
set -e

echo "🚀 Setting up Choosinator development environment..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to trust Cosmos DB emulator certificate
trust_cosmos_certificate() {
    echo "📜 Setting up Cosmos DB emulator SSL certificate trust..."
    
    # Wait for Cosmos DB emulator to be ready
    echo "⏳ Waiting for Cosmos DB emulator to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -k -s -f https://localhost:8081/_explorer/index.html > /dev/null 2>&1; then
            echo "✅ Cosmos DB emulator is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        echo "❌ Cosmos DB emulator is not responding after 60 seconds"
        return 1
    fi
    
    # Extract and trust the certificate
    COSMOS_CERT_PATH="/tmp/cosmos-emulator.crt"
    
    echo "📥 Extracting certificate from Cosmos DB emulator..."
    if openssl s_client -connect localhost:8081 -servername localhost </dev/null 2>/dev/null | openssl x509 -outform PEM > "$COSMOS_CERT_PATH" 2>/dev/null; then
        echo "✅ Certificate extracted successfully"
        
        # Add to system certificate store if possible
        if command_exists update-ca-certificates && [ -d "/usr/local/share/ca-certificates" ]; then
            echo "🔒 Adding certificate to system trust store..."
            if sudo cp "$COSMOS_CERT_PATH" /usr/local/share/ca-certificates/cosmos-emulator.crt 2>/dev/null && sudo update-ca-certificates >/dev/null 2>&1; then
                echo "✅ Certificate added to system trust store"
            else
                echo "⚠️  Could not add to system trust store (sudo required), but continuing..."
            fi
        fi
        
        # Add to .NET certificate store for current user
        if command_exists dotnet; then
            echo "🔧 Adding certificate to .NET certificate store..."
            if dotnet dev-certs https --trust --certificate-file "$COSMOS_CERT_PATH" >/dev/null 2>&1; then
                echo "✅ Certificate added to .NET certificate store"
            else
                echo "ℹ️  .NET certificate store update attempted"
            fi
        fi
        
        # Clean up
        rm -f "$COSMOS_CERT_PATH"
        echo "✅ SSL certificate setup complete!"
        return 0
    else
        echo "❌ Could not extract certificate from Cosmos DB emulator"
        return 1
    fi
}

# Main setup process
echo "🔍 Checking Docker services..."
if ! docker ps | grep -q "choosinator-cosmos-emulator"; then
    echo "⚠️  Cosmos DB emulator is not running. Starting Docker services..."
    docker-compose up -d
    echo "⏳ Waiting for services to start..."
    sleep 10
fi

# Trust the certificate
if trust_cosmos_certificate; then
    echo "🎉 Development environment setup complete!"
    echo ""
    echo "You can now run: npm run dev"
else
    echo "⚠️  Certificate setup had issues, but you can still try running the development server"
    echo "The application may work with SSL validation bypassed in code"
fi
