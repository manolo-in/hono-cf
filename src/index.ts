import { ExportedHandlerScheduledHandler } from "@cloudflare/workers-types";
import type { Env, ExecutionContext } from "hono";
import { Hono as NormalHono } from "hono";
import { createMiddleware } from "hono/factory";
import type { HonoOptions } from "hono/hono-base";
import type { BlankSchema, HandlerInterface, MiddlewareHandlerInterface, OnHandlerInterface, Schema, Variables } from "hono/types";
import { CronHandler, CronStringType, defineCollection, DefineCron } from "./cron";
import type { CF_Bindings, GenerateEnv } from "./types";
import { CommonContext } from "./var";

class HonoCF<
   V extends Variables = {},
   B extends CF_Bindings = {},
   E extends Env = GenerateEnv<B, V>,
   S extends Schema = BlankSchema,
   BasePath extends string = "/",
   C extends CommonContext<E> = CommonContext<E>
>
   extends NormalHono<E, S, BasePath> {
   private secretHono
   private customOptions

   private cronCollection: DefineCron<C>[] = []

   private variableHandlers = {} as { [K in keyof V]: (c: C) => Promise<V[K]> | V[K] }
   private variables: V = {} as V

   constructor(options?: {
      bindings?: B
      basePath?: string,
      hono?: HonoOptions<E>
   }) {
      super({ strict: false, ...options?.hono })
      this.customOptions = options
      this.secretHono = options?.basePath
         ? new NormalHono({ strict: false, ...options?.hono }).basePath(options.basePath)
         : new NormalHono({ strict: false, ...options?.hono })
   }

   basePath<SubPath extends string>(path: SubPath) {
      this.secretHono = this.secretHono.basePath(path)
      return this.secretHono
   }

   fetch = (request: Request, Env?: E["Bindings"], executionCtx?: ExecutionContext) => {
      return this.secretHono.fetch(request, Env, executionCtx)
   }

   get = ((...props: any[]) => {
      return this.secretHono.get(...props)
   }) as HandlerInterface<E, "get", S, BasePath>

   post = ((...props: any[]) => {
      return this.secretHono.post(...props)
   }) as HandlerInterface<E, "post", S, BasePath>

   on = ((...props: [any, any, any]) => {
      return this.secretHono.on(...props)
   }) as OnHandlerInterface<E, S, BasePath>;

   use = ((...props: any[]) => {
      return this.secretHono.use(...props)
   }) as MiddlewareHandlerInterface<E, S, BasePath>;

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

      ctx.waitUntil(
         cronJobs
            .find(controller.cron)
            .runOneByOne(c)
      )
   }

   set = <N extends keyof V>(name: N, handler: (c: C) => Promise<V[N]> | V[N]) => {
      this.variableHandlers[name] = handler

      const middleware = createMiddleware(async (c, next) => {
         c.set(name as string, await handler(c as unknown as C))
         await next();
      })

      this.secretHono.use(middleware)
   }
}

export { HonoCF };
