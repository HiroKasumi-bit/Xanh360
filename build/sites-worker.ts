import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    // Outside ChatGPT Sites (e.g. a plain Cloudflare Workers deploy) nothing in
    // front of the Worker vouches for these headers, so a client could forge an
    // admin identity. Drop them unless the deploy says a trusted proxy sets them.
    if (!import.meta.env.DEV && env.TRUST_PLATFORM_AUTH_HEADERS !== "true") {
      request = stripPlatformAuthHeaders(request);
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

function stripPlatformAuthHeaders(request: Request): Request {
  const names = [...request.headers.keys()].filter((name) => name.startsWith("oai-authenticated-user-"));
  if (!names.length) return request;
  const headers = new Headers(request.headers);
  for (const name of names) headers.delete(name);
  return new Request(request, { headers });
}
