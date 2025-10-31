import type { Env } from "hono";
import { Hono as NormalHono } from "hono";
import { createMiddleware } from "hono/factory";
import type { HonoOptions } from "hono/hono-base";
import type { BlankSchema, Schema, Variables } from "hono/types";

import { CronHandler, CronStringType, defineCollection, DefineCron } from "./cron";
import type { CF_Bindings, GenerateEnv } from "./types";
import { CommonContext } from "./var";
import { ExportedHandlerScheduledHandler } from "@cloudflare/workers-types";

class HonoCF<
    V extends Variables = {},
    B extends CF_Bindings = {},
    E extends Env = GenerateEnv<B, V>,
    S extends Schema = BlankSchema,
    BasePath extends string = "/",
    C extends CommonContext<E> = CommonContext<E>
>
    extends NormalHono<E, S, BasePath> {
    private customOptions

    private cronCollection: DefineCron<C>[] = []

    private variableHandlers = {} as { [K in keyof V]: (c: C) => Promise<V[K]> | V[K] }
    private variables: V = {} as V

    constructor(options?: {
        bindings?: B
        hono?: HonoOptions<E>
    }) {
        super({ strict: false, ...options?.hono })
        this.customOptions = options
    }

    $type = <NV extends Variables>() => {
        type newCustomOptionsType = HonoCF<NV, B>["customOptions"]
        return new HonoCF<NV, B>(this.customOptions as newCustomOptionsType)
    }

    alocateVariables = async (env: C["env"]) => {
        for (const [name, handler] of Object.entries(this.variableHandlers)) {
            this.variables[name] = await handler({
                env,
                var: this.variables
            } as unknown as C)
        }
    }

    cron = (cron: CronStringType, handler: CronHandler<C>) => {
        this.cronCollection.push({ cron, handler })
        return this
    }

    scheduled: ExportedHandlerScheduledHandler<E["Bindings"]> = async (
        controller,
        env,
        ctx,
    ) => {

        await this.alocateVariables(env)

        const cronJobs = defineCollection(this.cronCollection)

        const c = { env, var: this.variables } as unknown as C

        await cronJobs
            .find(controller.cron)
            .runOneByOne(c);
    }

    set = <N extends keyof V>(name: N, handler: (c: C) => Promise<V[N]> | V[N]) => {
        this.variableHandlers[name] = handler

        const middleware = createMiddleware(async (c, next) => {
            c.set(name as string, await handler(c as unknown as C))
            await next();
        })

        this.use(middleware)
    }
}

export { HonoCF };
