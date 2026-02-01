export interface LogEventContext {
    timestamp: string;
    performance: {
        duration_ms: number;
        memory_used: number;
    };
    business: {
        lifecycle: string;
    };
    infrastructure: {
        region: string;
    };
    error: {
        code: string;
        message: string;
    };
    request: {
        method: string;
        path: string;
    };
}

let context = {} as LogEventContext;

export function createEventContext(event: any) {
    const region = process.env.REGION || "unknown";
    const lifecycle = process.env.BUSINESS_LIFECYCLE || "unknown";

    // Extract request info from API Gateway event if available
    let method = "unknown";
    let path = "unknown";
    if (event?.httpMethod) {
        method = event.httpMethod;
    } else if (event?.requestContext?.http?.method) {
        method = event.requestContext.http.method;
    } else if (event?.method) {
        method = event.method;
    }

    if (event?.path) {
        path = event.path;
    } else if (event?.requestContext?.http?.path) {
        path = event.requestContext.http.path;
    } else if (event?.pathParameters) {
        path = event.pathParameters.proxy || "unknown";
    } else if (event?.rawPath) {
        path = event.rawPath;
    }

    // Initialize error fields as empty (will be populated if there's an actual error)
    const error = event.error || { code: "", message: "" };

    context = {
        timestamp: new Date().toISOString(),
        performance: {
            duration_ms: 0,
            memory_used: 0,
        },
        business: {
            lifecycle: event.business?.lifecycle || lifecycle,
        },
        infrastructure: {
            region: event.infrastructure?.region || region,
        },
        error: {
            code: error.code || "",
            message: error.message || "",
        },
        request: {
            method: event.request?.method || method,
            path: event.request?.path || path,
        },
    }
}

export function addToEventContext(updateFields: Partial<LogEventContext>) {
    context = {
        ...context,
        ...updateFields,
    }
}

export function recordEventContext() {
    const durationMs = Date.now() - new Date(context.timestamp).getTime();
    const memoryUsed = process.memoryUsage().heapUsed;
    console.log('about to log the event context')
    console.log(JSON.stringify({
        ...context,
        performance: {
            duration_ms: durationMs,
            memory_used: memoryUsed,
        },
    }));
}