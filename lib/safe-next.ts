export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  if (value.includes("\\") || value.includes("://") || /[\u0000-\u001F\u007F]/.test(value)) {
    return "/";
  }
  return value;
}
