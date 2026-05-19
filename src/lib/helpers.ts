export function when<T, F>(condition: unknown, truthy: T, falsy: F): T | F {
  return condition ? truthy : falsy
}

export function or<T>(...values: (T | null | undefined)[]): T | undefined {
  for (const value of values) {
    if (value !== null && value !== undefined) return value
  }
  return undefined
}
