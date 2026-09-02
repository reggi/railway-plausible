# Plausible Community Edition on Railway

Private, reproducible Railway infrastructure for self-hosting
[Plausible Community Edition](https://github.com/plausible/community-edition).

The entire service topology is declared in
[`.railway/railway.ts`](.railway/railway.ts). No application fork is required:
the deployment uses pinned upstream container images and Railway-managed
PostgreSQL.

The project uses Railway's official TypeScript SDK and requires Node.js 22 or
newer and Railway CLI 5.42.1 or newer.

## Architecture

| Service | Purpose | Persistence |
| --- | --- | --- |
| Plausible CE `v3.2.1` | Dashboard and analytics ingestion | Ephemeral |
| PostgreSQL | Accounts, sites, and configuration | Railway-managed |
| ClickHouse `24.12-alpine` | Analytics events | 1 GB volume |

Only Plausible is exposed publicly. Both databases remain on Railway's private
network. Railway sleep mode is enabled for Plausible to reduce idle compute
usage; incoming analytics or dashboard requests wake it automatically. Each
deployment supplies its own public hostname through `PLAUSIBLE_DOMAIN`.

## Configuration

Copy `.env.example` to `.env` and provide values for:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PLAUSIBLE_DOMAIN` | Yes | Public hostname, without a scheme or path |
| `PLAUSIBLE_SECRET_KEY_BASE` | First apply | Unique secret containing at least 64 bytes |

The IaC derives Plausible's `BASE_URL`, database URLs, private service
hostnames, and listening port. Registration is enabled and email verification
is disabled by default. Change those settings in `.railway/railway.ts` before
planning if the deployment requires different behavior.

## Persistence and backups

PostgreSQL stores accounts, sites, and application configuration. The
`clickhouse-data` volume stores analytics events. The Plausible application
service itself is ephemeral.

This repository does not automate backups. Configure Railway backups for
PostgreSQL and maintain a separate backup of the ClickHouse volume before
upgrades or other destructive changes. Test restoration procedures before
depending on those backups.

## Upgrades

Plausible and ClickHouse images are pinned in `.railway/railway.ts`. To upgrade,
change one image version at a time, review the upstream release and migration
notes, run `railway config plan`, and back up persistent data before applying
the reviewed plan.

## Deployment

See [`.railway/README.md`](.railway/README.md) for the bootstrap, plan, and
apply workflow.
