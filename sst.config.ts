/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "athena-for-logs-demo",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    await import("./infrastructure/server");
    await import("./infrastructure/bucket");
    await import("./infrastructure/delivery");
    await import("./infrastructure/athena");
  },
});
