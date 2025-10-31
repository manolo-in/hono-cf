import type { Env } from "hono";

export type CommonContext<E extends Env> = { env: E["Bindings"], var: E["Variables"] }
