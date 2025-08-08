#!/usr/bin/env node

import arc from "@architect/functions";
import bcrypt from "bcryptjs";

const DEV_USERS = [
    { email: "dev@example.com", password: "devpassword123" },
    { email: "dev2@example.com", password: "devpassword123" },
];

async function seedDevUser(email, password) {
    const db = await arc.tables();
    const userId = `email#${email}`;

    const existing = await db.user.query({
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: { ":userId": userId },
    });

    if (existing.Items && existing.Items.length > 0) {
        console.log(`ℹ️  Dev user already exists: ${email}`);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.password.put({
        userId,
        password: hashedPassword,
    });

    await db.user.put({
        userId,
        email,
    });

    console.log(`✅ Seeded dev user: ${email}`);
}

async function seedAll() {
    try {
        for (const { email, password } of DEV_USERS) {
            await seedDevUser(email, password);
        }
    } catch (err) {
        console.error("❌ Failed seeding dev users:", err?.message || err);
        process.exitCode = 1;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    seedAll();
}

export { seedDevUser, seedAll };

