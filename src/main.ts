import { createEventContext, recordEventContext, addToEventContext } from "./log.service";

export async function handler(event: any) {
    try {
        // Initialize log context with all fields from environment and event
        createEventContext(event);

        // Your business logic here
        // ...

        // Record the event context at the end
        recordEventContext();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Log recorded" }),
        };
    } catch (error: any) {
        // Update context with error information
        addToEventContext({
            error: {
                code: error.code || error.name || "UNKNOWN_ERROR",
                message: error.message || "An error occurred",
            },
        });

        // Record the event context with error
        recordEventContext();

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal server error",
                error: error.message,
            }),
        };
    }
}   