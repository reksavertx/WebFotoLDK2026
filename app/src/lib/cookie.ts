export function shouldUseSecureCookie(options: { nodeEnv?: string; appUrl?: string; override?: string }): boolean {
  if (options.override === "true") return true;
  if (options.override === "false") return false;
  return options.nodeEnv === "production" && options.appUrl?.startsWith("https://") === true;
}
