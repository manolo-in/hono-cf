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
   private setKeys = new Set<keyof V>()

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
      return this
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

   allocateVariables = async (env: E["Bindings"]) => {
      // Create a fresh variables object for this execution context to avoid race conditions
      const localVariables: Partial<V> = {}
      
      for (const [name, handler] of Object.entries(this.variableHandlers)) {
         try {
            localVariables[name as keyof V] = await handler({
               env,
               var: localVariables as V
            } as unknown as C)
         } catch (error) {
            console.error(`[HonoCF] Failed to allocate variable "${name}":`, error)
            throw error
         }
      }
      
      // Only update shared state after all variables are allocated successfully
      this.variables = localVariables as V
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
      try {
         await this.allocateVariables(env)

         const cronJobs = defineCollection(this.cronCollection)

         const c = { env, var: this.variables } as unknown as C

         await ctx.waitUntil(
            cronJobs
               .find(controller.cron)
               .runOneByOne(c)
         )
      } catch (error) {
         console.error('[HonoCF] Scheduled job failed:', error)
         throw error
      }
   }

   set = <N extends keyof V>(name: N, handler: (c: C) => Promise<V[N]> | V[N]) => {
      // Prevent duplicate middleware registration
      if (this.setKeys.has(name)) {
         console.warn(`[HonoCF] Variable "${String(name)}" is being overwritten`)
      }
      
      this.variableHandlers[name] = handler
      this.setKeys.add(name)

      const middleware = createMiddleware(async (c, next) => {
         try {
            c.set(name as string, await handler(c as unknown as C))
         } catch (error) {
            console.error(`[HonoCF] Failed to set variable "${String(name)}":`, error)
            throw error
         }
         await next();
      })

      this.secretHono.use(middleware)
   }
}

export { HonoCF };
