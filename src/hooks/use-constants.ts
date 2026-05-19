import { isConstant, type Constant } from '@/lib/constants'

type Prettify<T> = { [K in keyof T]: T[K] } & {}

type Resolved<T, TDeps extends unknown[]> = Prettify<{
  [K in keyof T]: T[K] extends Constant<TDeps, infer V> ? V : T[K]
}>

type InnerValue<V> = V extends Record<string, infer U> ? U : unknown

export function useConstants<T extends Record<string, unknown>, TDeps extends unknown[] = []>(
  definitions: T,
  ...deps: TDeps
) {
  const resolved: Record<string, unknown> = {}

  for (const key in definitions) {
    const value = definitions[key]
    resolved[key] = isConstant(value) ? value.resolve(...deps) : value
  }

  const consts = resolved as Resolved<T, TDeps>

  function getConst<K extends keyof Resolved<T, TDeps>>(
    key: K,
    ...overrideDeps: TDeps | []
  ): Resolved<T, TDeps>[K] {
    if (overrideDeps.length === 0) {
      return consts[key]
    }
    const def = definitions[key as string]
    return (isConstant(def) ? def.resolve(...(overrideDeps as TDeps)) : def) as Resolved<
      T,
      TDeps
    >[K]
  }

  function record<K extends keyof Resolved<T, TDeps>>(
    key: K,
    defaultObj: Partial<Resolved<T, TDeps>[K]> = {} as Partial<Resolved<T, TDeps>[K]>,
  ) {
    const merged = {
      ...(defaultObj as Record<string, unknown>),
      ...((consts[key] ?? {}) as Record<string, unknown>),
    }
    return {
      get<F = undefined>(innerKey: string, fallback?: F): InnerValue<Resolved<T, TDeps>[K]> | F {
        const value = merged[innerKey]
        return (value !== undefined ? value : fallback) as InnerValue<Resolved<T, TDeps>[K]> | F
      },
    }
  }

  return { consts, getConst, record }
}
