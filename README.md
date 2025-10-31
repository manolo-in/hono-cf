<a href="https://github.com/manolo-in/hono-cf">
    <img width="1584" height="396" alt="cover" src="https://github.com/manolo-in/hono-cf/blob/main/cover.png?raw=true" />
</a>

# Hono-CF

Hono with out-of-the-box support for Cloudflare.

### Installation

```bash
npm i hono-cf
```

### Usage

```ts
import { HonoCF } from "hono-cf";
import { CF_Bindings } from "hono-cf/types";

const app = new HonoCF({
    bindings: {
        d1_databases: ["DATABASE_1"],
        r2_buckets: ["BUCKET_1"],
        hyperdrive: ["HYPERDRIVE"]
    } as const satisfies CF_Bindings
})

app.get("/", async (c) => {
    return c.text("Hello");
});

app.cron("* * * * *", async (c) => {
    console.log(c.env.DATABASE_1) // typed to D1Database
})

export default app;
```

### Run

```bash
npx wrangler dev
```

### Variables

```ts
import { HonoCF } from "./src";
import { CF_Bindings } from "./src/types";

type Variables = {
    db: string
}

const app = new HonoCF({
    bindings: {
        hyperdrive: ["HYPERDRIVE"]
    } as const
}).$type<Variables>()

app.set("db", async (c) => c.env.HYPERDRIVE.connectionString);

app.cron("* * * * *", async (c) => {
    console.log(c.var.db)
})
```

### Resources

Hono [Docs](https://hono.dev/docs/)
