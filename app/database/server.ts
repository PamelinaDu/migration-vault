import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is missing. Check your .env file.");

const client = postgres(url, { ssl: "require", prepare: false });

export const db = drizzle(client);
