export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  APP_ORIGIN: string;
  MAILJET_API_KEY: string;
  MAILJET_SECRET_KEY: string;
  MAILJET_FROM_EMAIL: string;
}
