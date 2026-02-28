import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { notesRouter } from "./routers/notes";
import { tagsRouter } from "./routers/tags";
import { searchRouter } from "./routers/search";

export const appRouter = router({
  auth: authRouter,
  notes: notesRouter,
  tags: tagsRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
