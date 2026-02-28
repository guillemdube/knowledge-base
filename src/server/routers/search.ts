import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import type { Prisma } from "@/generated/prisma/client";

export const searchRouter = router({
  notes: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        tags: z.array(z.string().uuid()).optional(),
        includeArchived: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      // SQLite `contains` is case-insensitive by default
      const conditions: Prisma.NoteWhereInput[] = [
        { user_id: ctx.userId },
        {
          OR: [
            { title: { contains: input.query } },
            { content: { contains: input.query } },
          ],
        },
      ];

      if (!input.includeArchived) {
        conditions.push({ is_archived: false });
      }

      // Tag filtering (AND logic — note must have ALL selected tags)
      if (input.tags && input.tags.length > 0) {
        for (const tagId of input.tags) {
          conditions.push({ tags: { some: { tag_id: tagId } } });
        }
      }

      return ctx.prisma.note.findMany({
        where: { AND: conditions },
        include: { tags: { include: { tag: true } } },
        orderBy: { updated_at: "desc" },
      });
    }),
});
