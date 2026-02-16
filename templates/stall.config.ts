import chokidar from "chokidar";
import { rebuild, getDefaultBuildOptions } from "./stall.build";

const PORT = 5160;

const buildOptions = getDefaultBuildOptions();
const isProduction = process.argv.includes("--production");

await rebuild(buildOptions);

if (!isProduction) {
  chokidar
    .watch("src", { ignoreInitial: true })
    .on("all", () => rebuild(buildOptions));

  console.log(
    `Serving: http://localhost:${PORT}/${buildOptions.dist}/${buildOptions.output.split("/").pop()}`,
  );

  Bun.serve({
    port: PORT,
    fetch(req) {
      const filename = buildOptions.output.split("/").pop()!;
      const pathname = `/${buildOptions.dist}/${filename}`;

      if (new URL(req.url).pathname === pathname) {
        return new Response(Bun.file(buildOptions.output), {
          headers: {
            "Content-Type": "application/javascript",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });
} else {
  console.log("[✓] Build complete!");
  process.exit(0);
}
