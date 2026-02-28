import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookies } from "@/lib/auth";

export type Context = {
  prisma: typeof prisma;
  userId: string | null;
};

export async function createContext(): Promise<Context> {
  const auth = await getAuthFromCookies();
  return {
    prisma,
    userId: auth?.userId ?? null,
  };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});
