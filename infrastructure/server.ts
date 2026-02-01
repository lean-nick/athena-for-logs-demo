export const server = new sst.aws.Function("MyFunction2", {
    handler: "src/main.handler",
    environment: {
        REGION: 'us-east-1',
        BUSINESS_LIFECYCLE: "production",
    },
    timeout: '1 minute',
});