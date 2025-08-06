#!/usr/bin/env node

/**
 * Development setup script
 * Automatically creates a default user for local development
 */

const DEFAULT_DEV_USER = {
    email: "dev@example.com",
    password: "devpassword123",
};

async function setupDevUser() {
    try {
        console.log("🔧 Setting up development user...");

        // Make a request to the dev-auto-login route to create the user
        const response = await fetch("http://localhost:3333/dev-auto-login", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.ok) {
            console.log("✅ Development user setup complete!");
            console.log("📝 You can now:");
            console.log("   - Visit http://localhost:3333/dev-auto-login for quick login");
            console.log("   - Or login normally with:", DEFAULT_DEV_USER.email);
            console.log("");
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

    } catch (error) {
        console.error("❌ Error setting up development user:", error.message);
        console.log("💡 Make sure your development server is running first");
        console.log("   Try: npm run dev:auto");
    }
}

// Run the setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    setupDevUser();
}

export { setupDevUser }; 