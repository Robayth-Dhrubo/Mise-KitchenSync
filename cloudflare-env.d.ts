// Import Worker types as a module so they do not replace browser DOM types.
declare namespace Cloudflare {
  interface Env {
    DB?: import("@cloudflare/workers-types/index").D1Database;
    BUCKET?: import("@cloudflare/workers-types/index").R2Bucket;
    FABERGE_IMPORT_KEY?: string;
    FABERGE_OWNER_ID?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_PRICE_ID?: string;
    STRIPE_API_VERSION?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    BILLING_ENFORCED?: string;
  }
}
declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}
