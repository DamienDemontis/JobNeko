// Shared job queue - in production, use Redis or database
export const jobQueue = new Map<string, any>()