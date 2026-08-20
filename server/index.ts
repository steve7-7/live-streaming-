import { buildServer } from "./app.ts";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";

buildServer()
  .then((app) => app.listen({ port, host }))
  .then(() => console.log(`[streamly-api] listening on http://${host}:${port}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
