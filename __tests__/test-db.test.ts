import net from "node:net";
import { describe, expect, it } from "vitest";

function getDatabaseHostAndPort() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for local test database checks.");
  }

  const parsedUrl = new URL(databaseUrl);

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port),
  };
}

describe("local Docker test database", () => {
  it("accepts TCP connections on the local test port", async () => {
    const { host, port } = getDatabaseHostAndPort();

    await expect(
      new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error(`Timed out connecting to ${host}:${port}`));
        }, 3000);

        socket.once("connect", () => {
          clearTimeout(timeout);
          socket.end();
          resolve();
        });

        socket.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      })
    ).resolves.toBeUndefined();
  });
});
