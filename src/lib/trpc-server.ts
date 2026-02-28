import "server-only";
import { createContext } from "@/server/trpc";
import { appRouter } from "@/server/root";

export async function serverTrpc() {
  const ctx = await createContext();
  return appRouter.createCaller(ctx);
}
