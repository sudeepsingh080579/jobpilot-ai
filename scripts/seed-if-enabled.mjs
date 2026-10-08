import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit" });
process.exit(result.status ?? 1);
