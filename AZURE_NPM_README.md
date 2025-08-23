# Azure Development with npm Scripts

This approach uses Docker Compose for infrastructure services (Cosmos DB, Azurite, Web PubSub) and runs your development servers (Remix + .NET Functions) locally for hot reloading.

## 🚀 Quick Start

### 1. Start Infrastructure (Manual - once per session)

```bash
docker-compose up -d
```

### 2. Start Development Servers

```bash
npm run azure:dev
```

This starts both development servers:

- Azure Functions (.NET)
- Remix frontend

## 📋 Available Commands

### Development

```bash
npm run dev                    # Start Remix frontend (default)
npm run dev:azure             # Start Remix frontend with Azure config
npm run azure:functions       # Start Azure Functions
npm run azure:dev             # Start both development servers
```

### Quality & Testing

```bash
npm run build                 # Build for production
npm run test                  # Run unit tests
npm run test:playwright       # Run Playwright tests
npm run lint                  # Run ESLint
npm run typecheck             # Run TypeScript checks
npm run format                # Format code with Prettier
npm run validate              # Run all quality checks
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose (Manual Start)            │
    │  ┌─────────────┐  ┌─────────────┐                        │
    │  │   Cosmos    │  │   Azurite   │                        │
    │  │     DB      │  │  (Storage)  │                        │
    │  │  :8081     │  │  :10000     │                        │
    │  └─────────────┘  └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Azure Functions                        │   │
│  │              :7071 (dotnet func start)             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Remix Frontend                         │   │
│  │              :3000 (npm run dev)                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Service Details

### Infrastructure (Docker - Manual Start)

- **Cosmos DB**: https://localhost:8081
- **Azurite**: http://localhost:10000
- **Web PubSub**: Not available locally (use Azure service in production)

### Development Servers (npm scripts)

- **Azure Functions**: http://localhost:7071
- **Remix Frontend**: http://localhost:3000

## 🌐 Environment Variables

Copy `azure.env.template` to `.env.local` and modify as needed:

```bash
# Frontend
PORT=3000
NODE_ENV=development

# Azure Functions API
API_BASE_URL=http://localhost:7071

# Web PubSub (not available locally)
# WEBPUBSUB_URL=ws://localhost:8080

# Cosmos DB
COSMOS_CONNECTION_STRING=https://localhost:8081/...

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=http://localhost:10000/...
```

## 🔄 Development Workflow

### 1. Start Infrastructure (once per session)

```bash
docker-compose up -d
```

### 2. Start Development Servers

```bash
npm run azure:dev
```

### 3. Make Changes

- **Frontend**: Edit files in `app/` - auto-reloads
- **Functions**: Edit C# files - auto-restarts

### 4. Stop Development

```bash
# Stop dev servers (Ctrl+C)
```

### 5. Stop Infrastructure (when done)

```bash
docker-compose down
```

## 🎯 Benefits of This Approach

1. **Hot Reloading**: Both Remix and .NET Functions reload automatically
2. **Fast Development**: No container rebuilds for code changes
3. **Simple Commands**: Just npm scripts, no complex Docker commands
4. **Infrastructure Isolation**: Only infrastructure services are containerized
5. **Local Debugging**: Full debugging capabilities for both frontend and backend
6. **Familiar Workflow**: Standard npm-based development experience
7. **Clean Dependencies**: No AWS/Arc dependencies cluttering the project
8. **Manual Control**: You control when infrastructure starts/stops

## 🚨 Troubleshooting

### Infrastructure Not Running

```bash
# Check if Docker services are running
docker-compose ps

# Start infrastructure
docker-compose up -d

# View logs
docker-compose logs -f
```

### Functions Won't Start

```bash
# Check if port 7071 is free
lsof -i :7071

# Check Functions project
cd functions
dotnet build
func start --port 7071
```

### Frontend Won't Start

```bash
# Check if port 3000 is free
lsof -i :3000

# Check dependencies
npm install

# Try different port
PORT=3001 npm run dev:azure
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the ports
lsof -i :3000 | grep LISTEN
lsof -i :7071 | grep LISTEN
lsof -i :8081 | grep LISTEN

lsof -i :10000 | grep LISTEN

# Kill conflicting processes or change ports
```

## 🔄 Alternative Workflows

### Start Functions Only

```bash
npm run azure:functions
```

### Start Frontend Only

```bash
npm run dev:azure
```

### Start Both Dev Servers

```bash
npm run azure:dev
```

## 📚 Prerequisites

1. **Docker & Docker Compose**: For infrastructure services
2. **.NET 8 SDK**: For Azure Functions
3. **Node.js 18+**: For Remix frontend
4. **Azure Functions Core Tools**: `npm install -g azure-functions-core-tools`

## 🎉 Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start infrastructure** (once per session):

   ```bash
   docker-compose up -d
   ```

3. **Start development servers**:

   ```bash
   npm run azure:dev
   ```

4. **Open in browser**:
   - Frontend: http://localhost:3000
   - Functions: http://localhost:7071

5. **Start coding**! Changes will auto-reload.

6. **When done**:
   ```bash
   # Stop dev servers (Ctrl+C)
   # Stop infrastructure
   docker-compose down
   ```

---

**This approach gives you manual control over infrastructure and fast local development! 🚀**
