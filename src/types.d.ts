import {
    Ai,
    AnalyticsEngineDataset,
    D1Database,
    DispatchNamespace,
    Fetcher,
    Hyperdrive,
    ImagesBinding,
    KVNamespace,
    Queue,
    R2Bucket,
    RateLimit,
    SecretsStoreSecret,
    Service,
    Vectorize,
    WorkerVersionMetadata,
    Workflow
} from "@cloudflare/workers-types"

export type CF_Bindings = {
    d1_databases?: string[],
    r2_buckets?: string[],
    kv_namespaces?: string[],
    hyperdrive?: string[],

    ai?: string,
    analytics_engine_datasets?: string[],
    assets?: string,
    browser?: string,
    dispatch_namespaces?: string[],
    images?: string,
    mtls_certificates?: string[],
    queues?: string[]
    ratelimits?: string[]
    secrets_store_secrets?: string[]
    services?: string[]
    vectorize?: string[]
    version_metadata?: string,
    workflows?: string,
}

type ConvertFull<B extends CF_Bindings> =
    Record<NonNullable<B["d1_databases"]>[number], D1Database> &
    Record<NonNullable<B["r2_buckets"]>[number], R2Bucket> &
    Record<NonNullable<B["kv_namespaces"]>[number], KVNamespace> &
    Record<NonNullable<B["hyperdrive"]>[number], Hyperdrive> &

    Record<NonNullable<B["ai"]>, Ai> &
    Record<NonNullable<B["analytics_engine_datasets"]>[number], AnalyticsEngineDataset> &
    Record<NonNullable<B["assets"]>, Fetcher> &
    Record<NonNullable<B["browser"]>, Fetcher> &
    Record<NonNullable<B["dispatch_namespaces"]>[number], DispatchNamespace> &
    Record<NonNullable<B["images"]>, ImagesBinding> &
    Record<NonNullable<B["mtls_certificates"]>[number], Fetcher> &
    Record<NonNullable<B["queues"]>[number], Queue> &
    Record<NonNullable<B["ratelimits"]>[number], RateLimit> &
    Record<NonNullable<B["secrets_store_secrets"]>[number], SecretsStoreSecret> &
    Record<NonNullable<B["services"]>[number], Service> &
    Record<NonNullable<B["vectorize"]>[number], Vectorize> &
    Record<NonNullable<B["version_metadata"]>, WorkerVersionMetadata> &
    Record<NonNullable<B["workflows"]>, Workflow>



type CF_Bindings_Convertor<B extends Partial<CF_Bindings>> = ConvertFull<Required<B>>

export type GenerateEnv<B extends CF_Bindings, V extends Variables> = { Bindings: CF_Bindings_Convertor<B>, Variables: V }
