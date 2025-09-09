import bcrypt from "bcryptjs";
import invariant from "tiny-invariant";

import { getAzureDatabase } from "~/lib/azure-db.server";

export interface User {
  id: `email#${string}`;
  email: string;
}

export interface Password {
  password: string;
}

export async function getUserById(id: User["id"]): Promise<User | null> {
  const db = getAzureDatabase();
  const result = await db.query<User>(
    "user",
    "SELECT * FROM c WHERE c.userId = @userId",
    [{ name: "@userId", value: id }],
  );

  const [record] = result;
  if (record) return { id: record.id || record.userId, email: record.email };
  return null;
}

export async function getUserByEmail(email: User["email"]) {
  return getUserById(`email#${email}`);
}

async function getUserPasswordByEmail(email: User["email"]) {
  const db = getAzureDatabase();
  const result = await db.query<{ userId: string; password: string }>(
    "password",
    "SELECT * FROM c WHERE c.userId = @userId",
    [{ name: "@userId", value: `email#${email}` }],
  );

  const [record] = result;

  if (record) return { hash: record.password };
  return null;
}

export async function createUser(
  email: User["email"],
  password: Password["password"],
) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const db = getAzureDatabase();

  await db.put("password", {
    userId: `email#${email}`,
    password: hashedPassword,
  });

  await db.put("user", {
    userId: `email#${email}`,
    email,
  });

  const user = await getUserByEmail(email);
  invariant(user, `User not found after being created. This should not happen`);

  return user;
}

export async function deleteUser(email: User["email"]) {
  const db = getAzureDatabase();
  await db.delete("password", `email#${email}`);
  await db.delete("user", `email#${email}`);
}

export async function verifyLogin(
  email: User["email"],
  password: Password["password"],
) {
  const userPassword = await getUserPasswordByEmail(email);

  if (!userPassword) {
    return undefined;
  }

  const isValid = await bcrypt.compare(password, userPassword.hash);
  if (!isValid) {
    return undefined;
  }

  return getUserByEmail(email);
}
