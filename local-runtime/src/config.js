import path from "path";

const rootDir = path.resolve(process.cwd());

export const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || "0.0.0.0",
  jwtSecret: process.env.LOCAL_RUNTIME_JWT_SECRET || "madad-local-runtime-secret",
  activationSecret:
    process.env.LOCAL_RUNTIME_ACTIVATION_SECRET || "madad-local-activation-secret",
  cloudSyncUrl: process.env.CLOUD_SYNC_URL || "",
  cloudApiKey: process.env.CLOUD_SYNC_API_KEY || "",
  cloudTimeoutMs: Number(process.env.CLOUD_TIMEOUT_MS || 10000),
  dataDir: process.env.LOCAL_RUNTIME_DATA_DIR || path.join(rootDir, "data"),
  storageDir:
    process.env.LOCAL_RUNTIME_STORAGE_DIR || path.join(rootDir, "storage"),
  defaultTenantId: process.env.LOCAL_RUNTIME_DEFAULT_TENANT_ID || "local-tenant",
  defaultTenantName: process.env.LOCAL_RUNTIME_DEFAULT_TENANT_NAME || "MADAD Local",
};
