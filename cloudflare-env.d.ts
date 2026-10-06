declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    // "true" only when a trusted proxy (ChatGPT Sites) sets oai-authenticated-user-* headers.
    TRUST_PLATFORM_AUTH_HEADERS?: string;
  }
}
