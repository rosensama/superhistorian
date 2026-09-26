export function omitKey<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to drop it from the rest copy
  const { [key]: _omitted, ...rest } = obj;
  return rest;
}
