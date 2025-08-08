# Choosinator

A decision-making application built with Remix and AWS serverless architecture. Create lists of options and let the Choosinator help you make decisions!

## What's in the stack

- [AWS deployment](https://aws.com) with [Architect](https://arc.codes/)
- Production-ready [DynamoDB Database](https://aws.amazon.com/dynamodb/)
- [GitHub Actions](https://github.com/features/actions) for deploy on merge to production and staging environments
- Email/Password Authentication with [cookie-based sessions](https://remix.run/utils/sessions#createcookiesessionstorage)
- DynamoDB access via [`arc.tables`](https://arc.codes/docs/en/reference/runtime-helpers/node.js#arc.tables)
- Styling with [Tailwind](https://tailwindcss.com/)
- End-to-end testing with [Playwright](https://playwright.dev)
- Local third party request mocking with [MSW](https://mswjs.io)
- Unit testing with [Vitest](https://vitest.dev) and [Testing Library](https://testing-library.com)
- Code formatting with [Prettier](https://prettier.io)
- Linting with [ESLint](https://eslint.org)
- Static Types with [TypeScript](https://typescriptlang.org)

## Prerequisites

- Node.js 22.x or later
- npm or yarn
- AWS account with credentials configured

## Getting Started

1. **Clone the repository**

   ```sh
   git clone <your-repo-url>
   cd choosinator
   ```

2. **Install dependencies**

   ```sh
   npm install
   ```

3. **Set up environment variables**
   ```sh
   cp .env.example .env
   # Edit .env with your local values if needed
   ```

## Development

- Validate the app has been set up properly (optional):

  ```sh
  npm run validate
  ```

- Start dev server:

  ```sh
  npm run dev
  ```

This starts your app in development mode, rebuilding assets on file changes.

### Quick Development Login

Local users are auto-seeded via Architect Sandbox when the dev server starts.

```sh
npm run dev
```

Two users are created for you automatically:

- `dev@example.com` / `devpassword123`
- `dev2@example.com` / `devpassword123`

To change the seed data, edit `sandbox-seed.json`. To change the password, generate a new bcrypt hash and update the `password` entries:

```sh
node -e "console.log(require('bcryptjs').hashSync('your-new-password', 10))"
```

If you need to create users programmatically in tests, you can still use the existing test route:

```ts
await page.request.post("/tests/create-user", { data: { email } });
```

### Application Features:

The Choosinator is a decision-making application that helps users create and manage lists of options. The main functionality includes:

- **User Management**: Creating users, logging in and out [./app/models/user.server.ts](./app/models/user.server.ts)
- **Session Management**: User sessions and authentication [./app/session.server.ts](./app/session.server.ts)
- **Options Lists**: Creating and managing decision-making lists [./app/models/optionsList.server.ts](./app/models/optionsList.server.ts)
- **List Sharing**: Share lists with other users and manage sharing permissions [./app/models/optionsListSharing.server.ts](./app/models/optionsListSharing.server.ts)

### Database Schema:

The application uses DynamoDB with the following tables:

- `user` - User accounts and authentication
- `password` - Hashed passwords for user authentication
- `optionsList` - Decision-making lists created by users
- `option` - Individual options within lists
- `optionsListSharing` - Sharing permissions for lists

## List Sharing Feature

The Choosinator supports sharing lists with other users. Here's how it works:

### For List Owners:

- **Share Lists**: Enter an email address to share your list with another user
- **Manage Sharing**: View all users who have access to your list and remove access as needed
- **Visual Indicators**: Shared lists are clearly marked in the interface

### For Shared Users:

- **View Shared Lists**: Access lists shared with you in the "Shared with Me" section
- **Modify Lists**: Edit and modify lists that have been shared with you
- **Clear Attribution**: See who originally created the list

### How to Share:

1. Navigate to any list you own
2. Look for the "Share List" section
3. Enter the email address of the user you want to share with
4. Click "Share" to grant access
5. The user will now see the list in their "Shared with Me" section

### Security Features:

- Only list owners can share or unshare lists
- Users cannot share lists with themselves
- Users must exist in the system to be shared with
- Clear visual distinction between owned and shared lists

The database that comes with `arc sandbox` is an in memory database, so if you restart the server, you'll lose your data. The Staging and Production environments won't behave this way, instead they'll persist the data in DynamoDB between deployments and Lambda executions.

## Deployment

This application comes with GitHub Actions that handle automatically deploying your app to production and staging environments. By default, Arc will deploy to the `us-west-1` region, if you wish to deploy to a different region, you'll need to change your [`app.arc`](https://arc.codes/docs/en/reference/project-manifest/aws)

Prior to your first deployment, you'll need to do a few things:

- Create a new [GitHub repo](https://repo.new)

- [Sign up](https://portal.aws.amazon.com/billing/signup#/start) and login to your AWS account

- Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to [your GitHub repo's secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets). Go to your AWS [security credentials](https://console.aws.amazon.com/iam/home?region=us-west-2#/security_credentials) and click on the "Access keys" tab, and then click "Create New Access Key", then you can copy those and add them to your repo's secrets.

- Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html#getting-started-install-instructions).

- Create an [AWS credentials file](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html#getting-started-quickstart-new).

- Along with your AWS credentials, you'll also need to give your CloudFormation a `SESSION_SECRET` variable of its own for both staging and production environments, as well as an `ARC_APP_SECRET` for Arc itself.

  ```sh
  npx arc env --add --env staging ARC_APP_SECRET $(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  npx arc env --add --env staging SESSION_SECRET $(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  npx arc env --add --env production ARC_APP_SECRET $(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  npx arc env --add --env production SESSION_SECRET $(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  ```

  If you prefer, you can also use [1password](https://1password.com/password-generator) to generate a random secret, just replace the `$(node -e ...)` part with the generated secret.

  After adding environment variables, you'll need to redeploy to apply them:

  ```sh
  npx arc deploy --staging
  npx arc deploy --production
  ```

## Where do I find my CloudFormation?

You can find the CloudFormation template that Architect generated for you in the sam.yaml file.

To find it on AWS, you can search for [CloudFormation](https://console.aws.amazon.com/cloudformation/home) (make sure you're looking at the correct region!) and find the name of your stack (the name is a PascalCased version of what you have in `app.arc`, so by default it's ChoosinatorStaging and ChoosinatorProduction) that matches what's in `app.arc`, you can find all of your app's resources under the "Resources" tab.

## GitHub Actions

We use GitHub Actions for continuous integration and deployment. Anything that gets into the `main` branch will be deployed to production after running tests/build/etc. Anything in the `dev` branch will be deployed to staging.

## Testing

### Playwright

We use Playwright for our End-to-End tests in this project. You'll find those in the `tests` directory. As you make changes, add to an existing file or create a new file in the `tests` directory to test your changes.

To run these tests in development, run `npm run test:e2e` which will start the dev server for the app and run the Playwright tests.

We have a utility for testing authenticated features without having to go through the login flow:

```ts
await page.request.post("/__tests/create-user", { data: { email } });
// you are now logged in as a new user
```

### Vitest

For lower level tests of utilities and individual components, we use `vitest`. We have DOM-specific assertion helpers via [`@testing-library/jest-dom`](https://testing-library.com/jest-dom).

### Type Checking

This project uses TypeScript. It's recommended to get TypeScript set up for your editor to get a really great in-editor experience with type checking and auto-complete. To run type checking across the whole project, run `npm run typecheck`.

### Linting

This project uses ESLint for linting. That is configured in `.eslintrc.js`.

### Formatting

We use [Prettier](https://prettier.io/) for auto-formatting in this project. It's recommended to install an editor plugin (like the [VSCode Prettier plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)) to get auto-formatting on save. There's also a `npm run format` script you can run to format all files in the project.
