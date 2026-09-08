function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get baseUrl() {
    return required("BASE_URL");
  },
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get authPassphrase() {
    return required("AUTH_PASSPHRASE");
  },
  get s3() {
    return {
      endpoint: required("S3_ENDPOINT"),
      region: process.env.S3_REGION || "auto",
      bucket: required("S3_BUCKET"),
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      publicUrl: required("S3_PUBLIC_URL"),
    };
  },
  get anthropicApiKey() {
    return process.env.ANTHROPIC_API_KEY || "";
  },
};
