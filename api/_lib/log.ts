import { HttpError, json } from "./http";

type Handler = (req: Request) => Promise<Response>;

function line(fields: Record<string, unknown>): string {
  return JSON.stringify({ ts: new Date().toISOString(), ...fields });
}

// Envuelve cada function: una línea JSON por request (Vercel las captura en
// Logs), HttpError → respuesta tipada, excepción → 500 opaco + stack al log.
// Nunca loguear passwords, tokens ni cuerpos.
export function withHandler(route: string, fn: Handler): Handler {
  return async (req: Request): Promise<Response> => {
    const start = Date.now();
    let status = 500;
    try {
      const res = await fn(req);
      status = res.status;
      return res;
    } catch (error) {
      if (error instanceof HttpError) {
        status = error.status;
        return json({ error: error.code }, error.status);
      }
      console.error(
        line({
          level: "error",
          route,
          method: req.method,
          message: String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      );
      return json({ error: "internal" }, 500);
    } finally {
      console.log(
        line({ level: "info", event: "request", route, method: req.method, status, ms: Date.now() - start })
      );
    }
  };
}
