export type CF_Bindings = {
    hyperdrive?: string[],
    r2_buckets?: string[],
    d1_databases?: string[],
}

type ConvertFull<B extends CF_Bindings> =
    Record<NonNullable<B["d1_databases"]>[number], D1Database> &
    Record<NonNullable<B["hyperdrive"]>[number], Hyperdrive> &
    Record<NonNullable<B["r2_buckets"]>[number], R2Bucket>

type CF_Bindings_Convertor<B extends Partial<CF_Bindings>> = ConvertFull<Required<B>>

export type GenerateEnv<B extends CF_Bindings, V extends Variables> = { Bindings: CF_Bindings_Convertor<B>, Variables: V }
