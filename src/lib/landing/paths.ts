export function isLandingPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/lp/"));
}
