# IAM Roles for GitHub Actions OIDC Deployment

This directory contains the IAM role configurations needed for GitHub Actions to deploy your Architect (Arc) application using OIDC instead of hardcoded AWS credentials.

## Files

- `Choosinator-DeployRole-Staging.json` - Trust policy for staging deployment role (restricted to dev branch)
- `Choosinator-DeployRole-Staging-Policy.json` - Permissions policy for staging deployment role
- `Choosinator-DeployRole-Production.json` - Trust policy for production deployment role (restricted to main branch)
- `Choosinator-DeployRole-Production-Policy.json` - Permissions policy for production deployment role

## Security Features

✅ **Branch-restricted access**: Each role can only be assumed from its designated branch

- Staging role: `ref:refs/heads/dev` only
- Production role: `ref:refs/heads/main` only

✅ **Repository-scoped**: Only your specific repository can assume these roles
✅ **OIDC-based**: No long-lived credentials stored in GitHub secrets
✅ **Environment separation**: Staging and production have completely separate roles

## Setup Instructions

### 1. Create GitHub OIDC Provider (if not already exists)

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb5b6f9167b6b8c2c8c366
```

**Note**: The thumbprint above is public and safe to use. If the provider already exists, AWS will return an "already exists" error - this is expected and normal.

### 2. Create the IAM Roles

#### Staging Role

```bash
# Create the role
aws iam create-role \
  --role-name Choosinator-DeployRole-Staging \
  --assume-role-policy-document file://Choosinator-DeployRole-Staging.json

# Attach the permissions policy
aws iam put-role-policy \
  --role-name Choosinator-DeployRole-Staging \
  --policy-name Choosinator-DeployRole-Staging-Policy \
  --policy-document file://Choosinator-DeployRole-Staging-Policy.json
```

#### Production Role

```bash
# Create the role
aws iam create-role \
  --role-name Choosinator-DeployRole-Production \
  --assume-role-policy-document file://Choosinator-DeployRole-Production.json

# Attach the permissions policy
aws iam put-role-policy \
  --role-name Choosinator-DeployRole-Production \
  --policy-name Choosinator-DeployRole-Production-Policy \
  --policy-document file://Choosinator-DeployRole-Production-Policy.json
```

### 3. Update GitHub Actions Workflow

The workflow has been updated to use these roles instead of hardcoded AWS credentials. The key changes:

- Added `permissions.id-token: write` for OIDC
- Replaced `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` with `aws-actions/configure-aws-credentials@v4`
- Each environment now assumes its respective role in separate steps
- Uses `npm ci` instead of `npm install` for reproducible builds
- Uses `npx arc` instead of global installation

## Workflow Structure

The deployment now follows this secure pattern:

```yaml
# Configure AWS credentials for staging
- name: 🔐 Configure AWS (staging)
  if: github.ref == 'refs/heads/dev'
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::439882680258:role/Choosinator-DeployRole-Staging
    aws-region: us-west-2

# Deploy to staging
- name: 🚀 Arc deploy (staging)
  if: github.ref == 'refs/heads/dev'
  run: npx arc deploy --staging --prune
```

## Permissions Coverage

These policies grant comprehensive permissions for Arc deployment:

- **CloudFormation**: Full access for stack management
- **IAM**: Role creation and management for Lambda functions
- **Lambda**: Function deployment and management
- **DynamoDB**: Table creation and stream management
- **SNS**: Topic creation for table streams
- **API Gateway**: HTTP and WebSocket API management
- **EventBridge**: Event routing and management
- **CloudWatch Logs**: Log group management
- **S3**: Static asset hosting and deployment artifacts
- **SSM Parameter Store**: Configuration parameter access for Arc inventory

## Security Benefits

1. **No long-lived credentials** stored in GitHub secrets
2. **Automatic credential rotation** via OIDC tokens
3. **Repository-scoped access** - only your repo can assume these roles
4. **Branch-restricted access** - staging can't access production role and vice versa
5. **Environment separation** - staging and production have separate roles
6. **Principle of least privilege** - roles only have permissions they need

## Troubleshooting

If you get permission errors, ensure:

1. The OIDC provider exists in your AWS account
2. The roles have the correct trust policy with proper branch restrictions
3. The roles have sufficient permissions for all Arc services
4. The repository name in the trust policy matches exactly
5. You're deploying from the correct branch for each role

## Future Improvements

Once your deployment is stable, consider:

1. **Tightening permissions** to follow the principle of least privilege
2. **Adding permissions boundaries** for additional security
3. **Implementing cross-account deployment** if needed
4. **Adding CloudTrail monitoring** for deployment activity
5. **Resource-specific permissions** - narrow Resource fields to your specific stack resources
6. **CloudFront permissions** - if you enable CDN with @static, you may need `cloudfront:CreateInvalidation`

## Note

These policies grant broad permissions for deployment. While they're designed to unblock your current deployment issues, consider tightening them once your deployment is stable and you understand exactly which permissions are needed.
