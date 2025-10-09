export type RequireKeys<
  T extends Record<string, any>,
  K extends keyof T,
> = Required<Pick<T, K>> & Omit<T, K>;
