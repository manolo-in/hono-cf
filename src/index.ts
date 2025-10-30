import type { Context, Env } from "hono"
import { Hono as NormalHono } from "hono"
import type { HonoOptions } from "hono/hono-base"
import type { BlankSchema, Schema } from "hono/types"

import { CronHandler, CronStringType, defineCollection, DefineCron } from "./cron"
import type { CF_Bindings, CF_Bindings_Convertor } from "./types"

type CronContext<E extends Env> = Pick<Context<E>, "env"> & { var: E["Variables"] }

class HonoCF <
    B extends CF_Bindings = {},
    E extends Env = { Bindings: CF_Bindings_Convertor<B> },
    S extends Schema = BlankSchema,
    BasePath extends string = "/"
>
extends NormalHono<E,S,BasePath> {

    private cronCollection: DefineCron<CronContext<E>>[] = []

    constructor(options?: {
        bindings?: B
        hono?:  HonoOptions<E>
    }){
        super({strict: true, ...options?.hono})
    }

    cron = (cron:CronStringType, handler: CronHandler<CronContext<E>>) => {
        this.cronCollection.push({ cron, handler })
        return this
    }

    scheduled: ExportedHandlerScheduledHandler<E["Bindings"]> = async (
        controller,
        env,
        ctx,
    ) => {
        const cronJobs = defineCollection(this.cronCollection)

        await cronJobs
            .find(controller.cron)
            .runOneByOne({
                env,
                var: {}
            });
    }
}

export { HonoCF }
