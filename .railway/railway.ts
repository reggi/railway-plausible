import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import { env, loadEnvFile } from "node:process";
import {
  defineRailway,
  group,
  image,
  postgres,
  preserve,
  project,
  service,
  volume,
} from "railway/iac";

if (existsSync(".env")) {
  loadEnvFile();
}

const secretKeyBase = env.PLAUSIBLE_SECRET_KEY_BASE;
const plausibleDomain = env.PLAUSIBLE_DOMAIN;

if (!plausibleDomain) {
  throw new Error(
    "PLAUSIBLE_DOMAIN is required; set it to the hostname for this deployment",
  );
}

if (
  plausibleDomain.includes("://") ||
  plausibleDomain.includes("/") ||
  /\s/.test(plausibleDomain)
) {
  throw new Error(
    "PLAUSIBLE_DOMAIN must be a hostname without a scheme, path, or whitespace",
  );
}

if (secretKeyBase && Buffer.byteLength(secretKeyBase) < 64) {
  throw new Error(
    "PLAUSIBLE_SECRET_KEY_BASE must contain at least 64 bytes; generate it in .env before planning",
  );
}

const secretKeyBaseConfig = secretKeyBase
  ? { value: secretKeyBase, isSealed: true }
  : preserve();

export default defineRailway(() => {
  const postgresDatabase = postgres("postgres");

  const clickhouseData = volume("clickhouse-data", {
    region: "us-east4-eqdc4a",
    sizeMB: 1_024,
  });

  const clickhouse = service("clickhouse", {
    source: image("clickhouse/clickhouse-server:24.12-alpine"),
    healthcheck: "/ping",
    healthcheckTimeout: 120,
    env: {
      CLICKHOUSE_SKIP_USER_SETUP: "1",
      PORT: "8123",
    },
    volumeMounts: {
      "/var/lib/clickhouse": clickhouseData,
    },
  });

  const plausible = service("plausible", {
    source: image("ghcr.io/plausible/community-edition:v3.2.1"),
    start:
      '/bin/sh -c "/entrypoint.sh db createdb && /entrypoint.sh db migrate && /entrypoint.sh run"',
    healthcheck: "/api/health",
    healthcheckTimeout: 300,
    domains: [{ domain: plausibleDomain, port: 8000 }],
    deploy: {
      sleepApplication: true,
    },
    env: {
      BASE_URL: `https://${plausibleDomain}`,
      CLICKHOUSE_DATABASE_URL:
        "http://${{clickhouse.RAILWAY_PRIVATE_DOMAIN}}:8123/plausible_events_db",
      DATABASE_URL: postgresDatabase.env.DATABASE_URL,
      DISABLE_REGISTRATION: "false",
      ENABLE_EMAIL_VERIFICATION: "false",
      PORT: "8000",
      SECRET_KEY_BASE: secretKeyBaseConfig,
      TMPDIR: "/tmp",
    },
  });

  const databases = group("Databases", [
    postgresDatabase,
    clickhouse,
    clickhouseData,
  ]);

  return project("plausible-analytics", {
    resources: [databases, plausible],
  });
});
