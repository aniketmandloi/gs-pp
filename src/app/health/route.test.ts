import { expect, test, vi } from "vitest";

test("GET /health returns 503 with the commit when the database is unreachable", async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://user:password@db.invalid/neondb");
  vi.stubEnv("COMMIT_SHA", "0123456789abcdef0123456789abcdef01234567");
  const { GET } = await import("./route");

  const response = await GET();

  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    status: "error",
    commit: "0123456789abcdef0123456789abcdef01234567",
  });
});
