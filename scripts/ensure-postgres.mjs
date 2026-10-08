import { execSync } from "node:child_process";
import net from "node:net";

const urlValue = process.env.DATABASE_URL ?? "";
if (!urlValue.startsWith("postgres")) {
  console.error("DATABASE_URL must be a postgresql:// connection string. See .env.example.");
  process.exit(1);
}

const parsed = new URL(urlValue);
const host = parsed.hostname;
const port = Number(parsed.port || 5432);

function reachable() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(1000);
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (await reachable()) {
  process.exit(0);
}

const local = host === "127.0.0.1" || host === "localhost";
if (local) {
  try {
    execSync("docker compose up -d", { stdio: "inherit" });
  } catch {
    console.error("Postgres is not accepting connections, and Docker could not start it.");
    console.error("From the project root, run: docker compose up -d");
    process.exit(1);
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await reachable()) process.exit(0);
    await sleep(1000);
  }
}

console.error(`Cannot reach Postgres at ${host}:${port}.`);
process.exit(1);
