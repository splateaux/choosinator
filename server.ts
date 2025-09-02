import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/express";

if (process.env.NODE_ENV !== "production") {
  require("./mocks");
}

export const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});

// If running directly (not imported), start an Express server
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const { default: express } = await import("express");
    const app = express();

    // Serve static files from the build directory
    app.use("/_static/build", express.static("public/build"));
    app.use("/_static", express.static("public"));

    app.all("*", handler);

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })();
}
