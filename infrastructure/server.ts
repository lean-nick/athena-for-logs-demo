export const server = new sst.aws.Function("MyFunction", {
    handler: "src/main.handler.ts",
    environment: {
        REGION: aws.getRegion().then(r => r.name),
        BUSINESS_LIFECYCLE: "production",
    },
});