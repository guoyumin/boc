/** Server Action 里读取 FormData 的小工具。 */

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

export function num(fd: FormData, key: string): number {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? n : 0;
}

export function optNum(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function many(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string");
}

export function bool(fd: FormData, key: string): boolean {
  const v = str(fd, key);
  return v === "1" || v === "on" || v === "true";
}

export function errMsg(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "操作失败，请重试";
}

export function withMsg(path: string, msg: string, kind: "err" | "ok" = "err"): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${kind}=${encodeURIComponent(msg)}`;
}

/** redirect() 抛出的内部错误不能被吞掉 */
export function isRedirectError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}
