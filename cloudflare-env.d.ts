declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    // Workers AI, used for image recognition when no custom VISION_ENDPOINT adapter is configured.
    AI?: Ai;
    // "true" only when a trusted proxy (ChatGPT Sites) sets oai-authenticated-user-* headers.
    TRUST_PLATFORM_AUTH_HEADERS?: string;
  }
}
