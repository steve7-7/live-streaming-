import { buildApp } from "./app";
import { seedDatabase } from "./seed";

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

if (process.env.SEED_DEMO_DATA !== "false") await seedDatabase();

const app = await buildApp();
await app.listen({ port, host });
