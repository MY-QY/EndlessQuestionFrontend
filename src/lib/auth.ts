import type { QueryClient } from "@tanstack/react-query";

export async function clearAuthState(client: QueryClient) {
  // Keep the active user query so its observers receive the guest state.
  await Promise.all([
    client.cancelQueries({ queryKey: ["user"], exact: true }),
    client.cancelQueries({
      predicate: (query) => query.queryKey[0] === "private",
    }),
  ]);
  client.setQueryData(["user"], null);
  client.removeQueries({
    predicate: (query) => query.queryKey[0] === "private",
  });
}
