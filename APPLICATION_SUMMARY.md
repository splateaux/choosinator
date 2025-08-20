# Choosinator Application Summary

## Overview

Choosinator is a real-time decision-making application that allows users to create polls with weighted voting using a token system. Users can allocate up to 10 tokens across different options in a poll, enabling nuanced decision-making beyond simple yes/no voting.

## Core Functionality

### 1. **Poll Creation & Management**

- Users create polls from predefined options lists
- Each poll is tied to an options list (e.g., "Restaurants", "Movie Choices")
- Polls can be shared with other users
- Real-time collaboration with multiple users voting simultaneously

### 2. **Token-Based Voting System**

- Users receive 10 tokens per poll
- Tokens can be distributed across multiple options
- Users can adjust their token allocation in real-time
- Token changes are immediately visible to all participants
- Prevents users from exceeding their token limit

### 3. **Real-Time Collaboration**

- Live vote updates via WebSocket connections
- Presence tracking shows who's currently viewing a poll
- Instant synchronization of vote changes across all participants
- No page refresh required for updates

### 4. **User Management**

- Email/password authentication system
- Guest mode support (no account required)
- Session-based authentication with secure cookies
- User sharing and permissions for options lists

## Technical Architecture

### **Frontend Stack**

- **Remix 2.17.0** - Full-stack React framework with server-side rendering
- **React 18.2.0** - UI library with hooks and modern patterns
- **TypeScript** - Static typing throughout the application
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and development server

### **Backend Infrastructure (AWS Serverless)**

- **Architect Framework** - AWS infrastructure as code
- **Lambda Functions** - Serverless compute for API endpoints
- **API Gateway** - HTTP and WebSocket API management
- **DynamoDB** - NoSQL database with streams and TTL
- **EventBridge** - Event routing and processing
- **CloudFormation** - Infrastructure deployment

### **Real-Time Communication**

- **WebSocket API Gateway** - Persistent connections for real-time updates
- **DynamoDB Streams** - Change capture for vote updates
- **Event-Driven Architecture** - Vote changes trigger real-time broadcasts
- **Connection Management** - Tracks active WebSocket connections per poll

## Data Flow & Architecture

### **1. Vote Processing Flow**

```
User clicks vote button → Frontend buffers vote → POST to Lambda →
DynamoDB update → Stream triggers → EventBridge → Lambda →
WebSocket broadcast to all connected users
```

### **2. Real-Time Update System**

- **Client Connection**: WebSocket connects with pollId and userId
- **Vote Changes**: DynamoDB Streams capture all vote modifications
- **Event Publishing**: Streams trigger EventBridge events
- **Broadcasting**: Lambda functions send updates to all connected clients
- **Client Updates**: Frontend receives WebSocket messages and updates UI

### **3. Presence Tracking**

- **Heartbeat System**: Clients send presence updates every 10 seconds
- **TTL Management**: DynamoDB automatically cleans up stale presence records
- **Active Participants**: Real-time display of who's currently viewing a poll

## Database Schema

### **Core Tables**

- **`user`** - User accounts and authentication
- **`password`** - Hashed passwords (bcrypt)
- **`optionsList`** - Decision-making lists (e.g., "Restaurants")
- **`option`** - Individual options within lists
- **`poll`** - Active voting sessions
- **`pollVote`** - Token allocations with streaming enabled
- **`pollPresence`** - Real-time user presence with TTL
- **`pollConnections`** - WebSocket connection tracking
- **`optionsListSharing`** - User permissions and sharing

### **Key Design Patterns**

- **Composite Keys**: `POLL#<pollId>` and `VOTE#<optionId>#<userId>`
- **TTL Fields**: Automatic cleanup of presence and connection data
- **GSI Indexes**: Efficient queries for connection lookups and sharing
- **Stream Processing**: Real-time change capture for vote updates

## Security & Authentication

### **Session Management**

- **Cookie-based Sessions**: Secure HTTP-only cookies with CSRF protection
- **Session Secrets**: Environment-based secrets for production
- **Guest Support**: Anonymous users can participate with display names
- **Authentication Guards**: Protected routes require valid user sessions

### **Data Access Control**

- **User Isolation**: Users can only access their own data
- **Sharing Permissions**: Granular control over list sharing
- **Input Validation**: Server-side validation of all user inputs
- **SQL Injection Protection**: Parameterized queries via DynamoDB

## Development & Testing

### **Testing Strategy**

- **Unit Tests**: Vitest for utility functions and models
- **Integration Tests**: Testing Library for component testing
- **E2E Tests**: Playwright for full user journey testing
- **Mock Services**: MSW for third-party API mocking

### **Development Workflow**

- **Local Development**: Architect Sandbox for AWS service emulation
- **Hot Reloading**: Remix dev server with file watching
- **Type Checking**: TypeScript compilation and linting
- **Code Quality**: ESLint, Prettier, and Husky pre-commit hooks

## Deployment & CI/CD

### **Environment Management**

- **Staging Environment**: Automatic deployment from `dev` branch
- **Production Environment**: Automatic deployment from `main` branch
- **Environment Variables**: Secure secrets management via GitHub Actions
- **Regional Deployment**: Configurable AWS regions (default: us-west-1)

### **Infrastructure as Code**

- **Architect Manifest**: `app.arc` defines all AWS resources
- **CloudFormation**: Generated SAM templates for infrastructure
- **IAM Policies**: Least-privilege access for deployment roles
- **Resource Naming**: Consistent naming conventions across environments

## Performance Characteristics

### **Scalability Features**

- **Serverless Architecture**: Automatic scaling based on demand
- **Connection Pooling**: Efficient WebSocket connection management
- **TTL Cleanup**: Automatic removal of stale data
- **Event-Driven Updates**: Asynchronous processing of vote changes

### **Optimization Strategies**

- **Vote Buffering**: Client-side debouncing to reduce API calls
- **Connection Limits**: Per-user connection restrictions
- **Efficient Queries**: GSI usage for common access patterns
- **Stream Processing**: Real-time updates without polling

## Current Status & MVP Features

### **Completed Features**

✅ User authentication and session management  
✅ Options list creation and management  
✅ Poll creation from options lists  
✅ Real-time token-based voting system  
✅ WebSocket-based live updates  
✅ Presence tracking and participant display  
✅ List sharing and permissions  
✅ Guest mode support  
✅ Responsive UI with Tailwind CSS  
✅ Comprehensive testing suite

### **Technical Maturity**

- **Production Ready**: Full AWS serverless deployment
- **Testing Coverage**: Unit, integration, and E2E tests
- **Error Handling**: Comprehensive error boundaries and validation
- **Monitoring**: CloudWatch integration for AWS services
- **Security**: Secure authentication and data access controls

## Cost Considerations

### **Primary Cost Drivers**

1. **WebSocket Connections**: Per-minute charges for active connections
2. **DynamoDB Streams**: Charges per data change
3. **EventBridge**: Per-event processing costs
4. **Lambda Execution**: Compute time and memory allocation
5. **Real-time Presence**: Frequent database operations

### **Optimization Opportunities**

- Connection pooling and limits
- Caching layer for vote results
- Batch processing of presence updates
- Reduced real-time update frequency

This application represents a mature, production-ready MVP with sophisticated real-time collaboration features, built on modern serverless architecture principles and comprehensive testing practices.
