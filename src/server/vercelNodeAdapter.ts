type SupportedMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
type WebHandler = (request: Request) => Response | Promise<Response>;
type HandlerMap = Partial<Record<SupportedMethod, WebHandler>>;

/** Adapts Web Request/Response route handlers to Vercel's Node.js Functions contract. */
export function createVercelNodeHandler(handlers: HandlerMap) {
  return async function vercelNodeHandler(req: any, res: any): Promise<void> {
    const method = String(req.method || "GET").toUpperCase() as SupportedMethod;
    const handler = handlers[method];

    const send = async (response: Response): Promise<void> => {
      res.statusCode = response.status;
      response.headers.forEach((value, name) => res.setHeader(name, value));
      if (method === "HEAD" || !response.body) { res.end(); return; }
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } finally {
        reader.releaseLock();
      }
    };

    if (!handler) {
      const allowed = Object.keys(handlers).join(", ");
      await send(Response.json({ error: "Method not allowed" }, {
        status: 405,
        headers: { allow: allowed, "cache-control": "no-store" },
      }));
      return;
    }

    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers || {}) as Array<[string, unknown]>) {
        const lower = name.toLowerCase();
        if (["host", "content-length", "connection", "transfer-encoding", "expect"].includes(lower)) continue;
        if (typeof value === "string") headers.set(name, value);
        else if (Array.isArray(value)) headers.set(name, value.map(String).join(", "));
      }

      const host = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "localhost").split(",")[0].trim();
      const protocol = String(req.headers?.["x-forwarded-proto"] || "https").split(",")[0].trim();
      const url = new URL(String(req.url || "/"), `${protocol}://${host}`).toString();
      let body: string | undefined;
      if (method !== "GET" && method !== "HEAD") {
        if (typeof req.body === "string") body = req.body;
        else if (req.body !== undefined) body = JSON.stringify(req.body);
        else {
          const chunks: Uint8Array[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk instanceof Uint8Array ? chunk : new TextEncoder().encode(String(chunk)));
          }
          const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
          if (size) {
            const combined = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
            body = new TextDecoder().decode(combined);
          }
        }
      }

      const request = new Request(url, { method, headers, ...(body === undefined ? {} : { body }) });
      await send(await handler(request));
    } catch (error) {
      console.error("Vercel API adapter failed", { method, error });
      await send(Response.json({ error: "Internal server error" }, {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      }));
    }
  };
}
