import * as Sentry from "@sentry/nextjs";

const is_dev = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  tracesSampleRate: is_dev ? 1.0 : 0.1,

  /**
   * Off by default: high RAM use; can cause "Array buffer allocation failed"
   * during dev/build. Set SENTRY_INCLUDE_LOCAL_VARIABLES=1 to enable.
   */
  includeLocalVariables:
    process.env.SENTRY_INCLUDE_LOCAL_VARIABLES === "1",

  enableLogs: true,

  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV,
});
