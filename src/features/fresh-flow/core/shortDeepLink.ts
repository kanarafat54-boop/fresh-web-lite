const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The Short a link points at (`?short=<id>`), or null. Only a well-formed id is accepted. */
export function parseShortDeepLink(search: string): string | null {
  const value = new URLSearchParams(search).get("short");
  return value && UUID.test(value) ? value.toLowerCase() : null;
}

/** The address bar without the `short` parameter, so a reload does not reopen the Short. */
export function withoutShortParam(pathname: string, search: string, hash: string): string {
  const params = new URLSearchParams(search);
  params.delete("short");
  const rest = params.toString();
  return `${pathname}${rest ? `?${rest}` : ""}${hash}`;
}
