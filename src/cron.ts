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
        const handlers: DefineCron<T>["handler"][] = collection.map(c => c.handler)

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
                for (const handler of handlers) {
                    await handler(ctx)
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
