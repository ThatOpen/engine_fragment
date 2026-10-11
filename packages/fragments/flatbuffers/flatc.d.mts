export const FLATC_VERSION: string;
export function resolveFlatc(): Promise<string>;
export function resolveReflectionSchema(): Promise<string>;
export function flatc(
  args: string[],
  options?: { cwd?: string },
): Promise<string>;
