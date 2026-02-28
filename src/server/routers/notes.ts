import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const notesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        content: z.string().optional().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.note.create({
        data: {
          user_id: ctx.userId,
          title: input.title,
          content: input.content,
        },
        include: { tags: { include: { tag: true } } },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.id, user_id: ctx.userId },
        include: {
          tags: { include: { tag: true } },
          linksFrom: { include: { toNote: { select: { id: true, title: true } } } },
          linksTo: { include: { fromNote: { select: { id: true, title: true } } } },
        },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      return note;
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          includeArchived: z.boolean().optional().default(false),
        })
        .optional()
        .default({ includeArchived: false })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.note.findMany({
        where: {
          user_id: ctx.userId,
          ...(input.includeArchived ? {} : { is_archived: false }),
        },
        include: { tags: { include: { tag: true } } },
        orderBy: { updated_at: "desc" },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.id, user_id: ctx.userId },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      return ctx.prisma.note.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.content !== undefined && { content: input.content }),
        },
        include: { tags: { include: { tag: true } } },
      });
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.id, user_id: ctx.userId },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      return ctx.prisma.note.update({
        where: { id: input.id },
        data: { is_archived: true },
      });
    }),

  unarchive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.id, user_id: ctx.userId },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      return ctx.prisma.note.update({
        where: { id: input.id },
        data: { is_archived: false },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.id, user_id: ctx.userId },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      await ctx.prisma.note.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // Note linking
  link: protectedProcedure
    .input(
      z.object({
        fromNoteId: z.string().uuid(),
        toNoteId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify both notes belong to user
      const [from, to] = await Promise.all([
        ctx.prisma.note.findFirst({ where: { id: input.fromNoteId, user_id: ctx.userId } }),
        ctx.prisma.note.findFirst({ where: { id: input.toNoteId, user_id: ctx.userId } }),
      ]);

      if (!from || !to) {
        throw new TRPCError({ code: "NOT_FOUND", message: "One or both notes not found" });
      }

      // Upsert to ignore duplicates
      await ctx.prisma.noteLink.upsert({
        where: {
          from_note_id_to_note_id: {
            from_note_id: input.fromNoteId,
            to_note_id: input.toNoteId,
          },
        },
        create: {
          from_note_id: input.fromNoteId,
          to_note_id: input.toNoteId,
        },
        update: {},
      });

      return { success: true };
    }),

  unlink: protectedProcedure
    .input(
      z.object({
        fromNoteId: z.string().uuid(),
        toNoteId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.noteLink.deleteMany({
        where: {
          from_note_id: input.fromNoteId,
          to_note_id: input.toNoteId,
        },
      });

      return { success: true };
    }),
});
