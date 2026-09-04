function normalizeBasePath(value: string): string {
  if (!value || value === "/") return "";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

export function appPath(pathname: string, configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""): string {
  const basePath = normalizeBasePath(configuredBasePath);
  if (!basePath || !pathname.startsWith("/")) return pathname;
  return pathname === basePath || pathname.startsWith(`${basePath}/`) ? pathname : `${basePath}${pathname}`;
}
