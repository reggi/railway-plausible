# Railway infrastructure

`.railway/railway.ts` is the source of truth for the complete Plausible
Community Edition deployment.

The stack contains:

- Plausible Community Edition `v3.2.1`
- Railway-managed PostgreSQL
- ClickHouse `24.12-alpine`
- A 1 GB persistent ClickHouse volume
- Private database networking
- Plausible migrations and health checks
- Railway sleep mode for the Plausible web service

## Bootstrap

Create an empty Railway project and link this directory:

```sh
railway init --name plausible-analytics
```

Create the local secret file before planning:

```sh
cp .env.example .env
```

Set `PLAUSIBLE_DOMAIN` in `.env` to the hostname for your deployment, without
an `https://` prefix. Then generate the secret:

```sh
printf 'PLAUSIBLE_SECRET_KEY_BASE=' >> .env
openssl rand -base64 64 | tr -d '\n' >> .env
printf '\n' >> .env
```

Preview and apply the infrastructure:

```sh
railway config plan
railway config apply
```

The Plausible service uses `PLAUSIBLE_DOMAIN` as its custom domain and derives
`BASE_URL` as `https://<PLAUSIBLE_DOMAIN>`. Railway reports the DNS record that
must be configured after apply.

The IaC runner reads `PLAUSIBLE_DOMAIN` and `PLAUSIBLE_SECRET_KEY_BASE` from the
gitignored `.env` file. It writes the secret to Railway as the sealed
`SECRET_KEY_BASE` variable. The secret is never stored in tracked source or
printed by a normal plan. Keep `PLAUSIBLE_DOMAIN` available for future plans.
After the first successful apply, the secret may be removed from `.env`;
subsequent plans preserve Railway's sealed value. Add it again only when
intentionally rotating the secret.
