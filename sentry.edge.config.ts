import * as Sentry from "@sentry/nextjs";

const is_dev = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  tracesSampleRate: is_dev ? 1.0 : 0.1,

  enableLogs: true,

  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV,
});
