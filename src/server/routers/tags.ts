import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const tagsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Tag name is required").max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.tag.findUnique({
        where: {
          user_id_name: {
            user_id: ctx.userId,
            name: input.name,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Tag already exists",
        });
      }

      return ctx.prisma.tag.create({
        data: {
          user_id: ctx.userId,
          name: input.name,
        },
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.tag.findMany({
      where: { user_id: ctx.userId },
      include: {
        _count: { select: { notes: true } },
      },
      orderBy: { name: "asc" },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.prisma.tag.findFirst({
        where: { id: input.id, user_id: ctx.userId },
      });

      if (!tag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });
      }

      await ctx.prisma.tag.delete({ where: { id: input.id } });
      return { success: true };
    }),

  assignToNote: protectedProcedure
    .input(
      z.object({
        noteId: z.string().uuid(),
        tagId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify note and tag belong to user
      const [note, tag] = await Promise.all([
        ctx.prisma.note.findFirst({ where: { id: input.noteId, user_id: ctx.userId } }),
        ctx.prisma.tag.findFirst({ where: { id: input.tagId, user_id: ctx.userId } }),
      ]);

      if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      if (!tag) throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found" });

      // Upsert to handle duplicates gracefully
      await ctx.prisma.noteTag.upsert({
        where: {
          note_id_tag_id: {
            note_id: input.noteId,
            tag_id: input.tagId,
          },
        },
        create: {
          note_id: input.noteId,
          tag_id: input.tagId,
        },
        update: {},
      });

      return { success: true };
    }),

  removeFromNote: protectedProcedure
    .input(
      z.object({
        noteId: z.string().uuid(),
        tagId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.noteTag.deleteMany({
        where: {
          note_id: input.noteId,
          tag_id: input.tagId,
        },
      });

      return { success: true };
    }),
});
