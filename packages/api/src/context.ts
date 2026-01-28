import type { Context as HonoContext } from "hono";

import { auth } from "@justitia/auth";
import type { user } from "@justitia/db";

// Extended user type with role
type UserWithRole = typeof user.$inferSelect;

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session: session ? {
      ...session,
      user: session.user as UserWithRole
    } : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
