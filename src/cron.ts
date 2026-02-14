// Cron pattern type support
// Currently supports: "*" (any) and numeric values (e.g., "0", "12", "23")
// Future support planned for: ranges (0-5), steps (*/15), lists (1,3,5)
// Note: Cloudflare supports full cron syntax - validation happens at runtime
type CronInstance = "*" | `${number}` // | `${number}/${number}` | `${number}-${number}` | `${number}-${number}/${number}`

export type CronStringType = `${CronInstance} ${CronInstance} ${CronInstance} ${CronInstance} ${CronInstance}` // | ({} & string)

export type CronHandler<T extends unknown> = (ctx: T) => Promise<void>

export const defineCron = <T extends unknown>
    (cron: CronStringType, handler: CronHandler<T>) => {
    return { cron, handler }
}
export type DefineCron<T extends unknown> = ReturnType<typeof defineCron<T>>
export type CronCollection<T extends unknown> = DefineCron<T>[]

export const defineCollection = <T extends unknown>(collection: CronCollection<T>) => {
    const find = (code: string) => {
        const handlers: DefineCron<T>["handler"][] = collection.filter(e => e.cron === code).map(c => c.handler)

        if (handlers.length === 0)
            throw new Error(`Cron job not found for code: ${code}`)

        return {
            handlers,
            run: async (ctx: T) => {
                const handler = handlers[0]
                if (handler) {
                    return await handler(ctx)
                }
            },
            runOneByOne: async (ctx: T) => {
                const errors: Error[] = []
                for (const handler of handlers) {
                    try {
                        await handler(ctx)
                    } catch (error) {
                        console.error('[HonoCF] Cron handler failed:', error)
                        errors.push(error instanceof Error ? error : new Error(String(error)))
                    }
                }
                // If any handlers failed, throw an aggregate error
                if (errors.length > 0) {
                    throw new Error(`${errors.length} cron handler(s) failed: ${errors.map(e => e.message).join(', ')}`)
                }
            },
            runConcurrently: async (ctx: T) =>
                await Promise.allSettled(
                    handlers.map(handler => handler(ctx))
                )

        }
    }

    return {
        find
    }
}

// const cronJobs = defineCollection<Context>([
//     defineCron("* * * * *", async () => console.log("1")),
//     defineCron("* * * * *", async () => console.log("2")),
//     defineCron("0 12 * * *", async () => console.log("3")),
// ])
