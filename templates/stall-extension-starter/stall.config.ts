import { build } from "bun";
import chokidar from "chokidar";

const PORT = 5151;
const DIST = "dist";
const ENTRY = "./src/index.ts";
const FILENAME = "index.js";
const OUTPUT = `${DIST}/${FILENAME}`;

const rebuild = async () => {
  try {
    await build({
      entrypoints: [ENTRY],
      outdir: DIST,
      target: "browser",
      sourcemap: "none",
      minify: true,
      splitting: false,
      format: "esm",
    });
    const date = new Date().toLocaleTimeString();
    console.log(`[✓] Rebuilt at ${date}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Build failed";
    console.error(`[x] Build error: ${message}`);
  }
};

await rebuild();

// Watching changes
chokidar.watch("src", { ignoreInitial: true }).on("all", async () => {
  await rebuild();
});

// Dev server
console.log(`🚀 Serving: http://localhost:${PORT}/${DIST}/${FILENAME}`);

Bun.serve({
  port: PORT,
  fetch(req,) {
    const url = new URL(req.url);
    if (url.pathname === `/${DIST}/${FILENAME}`) {
      return new Response(Bun.file(OUTPUT), {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});
