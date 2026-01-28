import { env } from "@justitia/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export const db = drizzle(env.DATABASE_URL, { schema });

// Re-export schema for convenience
export * from "./schema";

// Re-export drizzle-orm utilities to ensure consistent versions across monorepo
export { eq, and, or, not, desc, asc, sql, count, inArray, isNull, isNotNull } from "drizzle-orm";
