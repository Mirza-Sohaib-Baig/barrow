import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "@/drizzle/schema";

if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

type Database = NeonDatabase<typeof schema>;
export type WriteTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function withWriteTransaction<T>(run: (tx: WriteTx) => Promise<T>): Promise<T> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle({ client: pool, schema });
  try {
    return await database.transaction(run);
  } finally {
    await pool.end();
  }
}
