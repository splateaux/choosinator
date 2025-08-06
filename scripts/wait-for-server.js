#!/usr/bin/env node

/**
 * Wait for server to be ready and then run setup
 */

async function waitForServer() {
  const maxAttempts = 30;
  const delay = 1000; // 1 second

  console.log("⏳ Waiting for server to be ready...");

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch("http://localhost:3333");
      if (response.ok) {
        console.log("✅ Server is ready!");
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }

    if (i < maxAttempts - 1) {
      process.stdout.write(".");
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log("\n❌ Server didn't start in time");
  return false;
}

async function main() {
  const serverReady = await waitForServer();

  if (serverReady) {
    // Import and run the setup
    const { setupDevUser } = await import("./dev-setup.js");
    await setupDevUser();
  } else {
    process.exit(1);
  }
}

main().catch(console.error);
