import { createEventContext, recordEventContext, addToEventContext } from "./log.service";

export async function handler(event: any) {
    try {
        console.info("DEBUG: Handler started");
        createEventContext(event);

        console.log('shiaidsihaidasihdiahsdih')
        console.log('shiaidsihaidasihdiahsdih')
        console.log('shiaidsihaidasihdiahsdih')

        recordEventContext();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Log recorded" }),
        };
    } catch (error: any) {
        addToEventContext({
            error: {
                code: error.code || error.name || "UNKNOWN_ERROR",
                message: error.message || "An error occurred",
            },
        });
        recordEventContext();

        console.error('Error occurred:', error);
        throw Error(
            'ahhhhhh'
        )
    }
}   