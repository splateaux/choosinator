# Azure GitHub Actions Setup Instructions

## Overview

This document explains how to set up the required GitHub secrets and variables for the Azure migration workflows to function properly.

## Required GitHub Secrets

Set these in your GitHub repository secrets (`Settings` → `Secrets and variables` → `Actions` → `Secrets`):

### Azure Service Principal Credentials

```bash
AZURE_CLIENT_ID=your-azure-app-registration-client-id
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_SUBSCRIPTION_ID=your-azure-subscription-id
```

### How to Create Azure Service Principal

1. **Install Azure CLI** (if not already installed):

   ```bash
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Login to Azure**:

   ```bash
   az login
   ```

3. **Create Service Principal**:

   ```bash
   az ad sp create-for-rbac --name "choosinator-github-actions" \
     --role contributor \
     --scopes /subscriptions/your-subscription-id \
     --sdk-auth
   ```

4. **Copy the output** and set the secrets:
   - `AZURE_CLIENT_ID` = `clientId`
   - `AZURE_TENANT_ID` = `tenantId`
   - `AZURE_SUBSCRIPTION_ID` = `subscriptionId`

## Required GitHub Variables

Set these in your GitHub repository variables (`Settings` → `Secrets and variables` → `Actions` → `Variables`):

```bash
AZURE_FUNCTION_APP_NAME=choosinator-azure-dev-functions
AZURE_WEB_APP_NAME=choosinator-azure-dev-web
AZ_ENV=azure-dev
```

## Environment Setup

### 1. Create GitHub Environment

1. Go to `Settings` → `Environments`
2. Click `New environment`
3. Name it `azure-dev`
4. Add protection rules if needed (e.g., required reviewers)

### 2. Configure Environment Variables

In the `azure-dev` environment, add these variables:

- `AZURE_FUNCTION_APP_NAME`
- `AZURE_WEB_APP_NAME`
- `AZ_ENV`

## Workflow Triggers

### Infrastructure Workflow (`infra-azure.yml`)

- **Triggers**: Changes to `infra/azure/**` or `azure.yaml`
- **Branches**: `azure-migration` branch only
- **Manual**: Can be triggered manually via workflow dispatch

### Functions Workflow (`functions-azure.yml`)

- **Triggers**: Changes to `functions/**`
- **Branches**: `azure-migration` branch only
- **Actions**: Builds, tests, and deploys C# Functions

### Frontend Workflow (`frontend-azure.yml`)

- **Triggers**: Changes to `app/**`, `remix.config.*`, or `package*.json`
- **Branches**: `azure-migration` branch only
- **Actions**: Builds and deploys Remix app to Azure App Service

## Branch Protection

Ensure the `azure-migration` branch has appropriate protection:

1. Go to `Settings` → `Branches`
2. Add rule for `azure-migration`
3. Enable required status checks for the Azure workflows
4. Set required reviewers if needed

## Testing the Setup

### 1. Push to azure-migration branch

```bash
git checkout -b azure-migration
git push -u origin azure-migration
```

### 2. Make a change to trigger workflows

```bash
# Edit any file in the monitored paths
echo "# Test" >> infra/azure/README.md
git add .
git commit -m "Test Azure workflows"
git push
```

### 3. Check Actions tab

- Go to `Actions` tab in GitHub
- Verify workflows are triggered
- Check for any errors in the logs

## Troubleshooting

### Common Issues

1. **Environment not found**: Ensure `azure-dev` environment exists and is properly configured
2. **Secrets not accessible**: Verify secrets are set in the correct repository
3. **Permission denied**: Check that the Azure service principal has the correct roles
4. **Build failures**: Ensure the functions project structure matches the workflow expectations

### Debug Commands

```bash
# Check Azure CLI authentication
az account show

# List service principals
az ad sp list --display-name "choosinator-github-actions"

# Check resource group access
az group list --query "[].name" -o tsv
```

## Next Steps

After setting up the GitHub Actions:

1. **Test Infrastructure Deployment**: Make a small change to `infra/azure/main.bicep`
2. **Verify Functions Build**: Check that the C# project builds successfully
3. **Test Frontend Deployment**: Ensure the Remix app builds and deploys
4. **Monitor Costs**: Keep an eye on Azure resource costs during development

## Security Notes

- Never commit secrets to the repository
- Use least-privilege principle for Azure service principal
- Regularly rotate service principal credentials
- Monitor GitHub Actions usage and costs
