import "server-only";
import { neon } from "@neondatabase/serverless";

type Database = ReturnType<typeof neon>;
let database: Database | undefined;

function databaseUrl(): string {
  const value = process.env.DATABASE_URL?.replace(/^"|"$/g, "");
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return value;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase(): Database {
  database ??= neon(databaseUrl());
  return database;
}
