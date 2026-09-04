export function imageVariant(variant: string | null): "thumb" | "full" {
  return variant === "thumb" ? "thumb" : "full";
}
