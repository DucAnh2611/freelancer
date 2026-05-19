const CONSTANT_MARKER = Symbol('constant')

export type Constant<TDeps extends unknown[], TValue> = {
  readonly [CONSTANT_MARKER]: true
  readonly resolve: (...deps: TDeps) => TValue
}

export function createConstant<TDeps extends unknown[], TValue>(
  factory: (...deps: TDeps) => TValue,
): Constant<TDeps, TValue>
export function createConstant<TValue>(value: TValue): TValue
export function createConstant(input: unknown): unknown {
  if (typeof input === 'function') {
    return {
      [CONSTANT_MARKER]: true,
      resolve: input,
    }
  }
  return input
}

export function isConstant(value: unknown): value is Constant<unknown[], unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[CONSTANT_MARKER] === true
  )
}
