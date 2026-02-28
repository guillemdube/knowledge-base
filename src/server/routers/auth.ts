import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { hashPassword, verifyPassword, setAuthCookie, clearAuthCookie } from "@/lib/auth";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      const password_hash = await hashPassword(input.password);

      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          password_hash,
        },
      });

      await setAuthCookie({ userId: user.id, email: user.email });

      return { id: user.id, email: user.email };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const valid = await verifyPassword(input.password, user.password_hash);

      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      await setAuthCookie({ userId: user.id, email: user.email });

      return { id: user.id, email: user.email };
    }),

  logout: protectedProcedure.mutation(async () => {
    await clearAuthCookie();
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, email: true, created_at: true },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),
});
