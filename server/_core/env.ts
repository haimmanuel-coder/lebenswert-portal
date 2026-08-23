export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  // Eigener S3-kompatibler Datei-Speicher (Ersatz für den Manus/Forge-Speicher).
  // Wenn Bucket + Zugangsdaten gesetzt sind, wird dieser statt Forge verwendet.
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3Region: process.env.S3_REGION ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  // Nicht-AWS-Anbieter (Hetzner, IONOS, MinIO …) benötigen meist Path-Style-URLs.
  s3ForcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") !== "false",
};
