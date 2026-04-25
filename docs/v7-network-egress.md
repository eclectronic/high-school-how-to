# v7 Network Egress — App Runner Default Egress + Public Postgres

**Status**: Adopted 2026-04-25
**Author**: Ron Levasseur
**Supersedes**: the App Runner VPC connector configuration in `api/scripts/aws-apprunner-setup.sh` (still present in source as of this doc; see Follow-ups)

## Problem

After v7.0.0 (Google Sign-In) deployed to production on 2026-04-22, every Google Sign-In attempt returned `401 Unauthorized`. Two patch releases (7.0.1 diagnostic logging, 7.0.2 JWKS fetch timeout) narrowed the symptom but did not fix it. This doc records the root cause we eventually identified and the architecture change adopted to fix it.

## Diagnostic journey

The frontend showed "We could not match that email/password" — `login.component.ts:99-107` maps any 401 from either auth endpoint to that string, regardless of whether the failure came from `/api/auth/login` or `/api/auth/google`. Misleading, but a separate UX issue.

The `/api/auth/google` response body carried `detail: "Invalid Google ID token"` — one of the six exceptions thrown by `GoogleIdTokenVerifier`. The verifier swallowed the underlying Nimbus exception at `DEBUG` level, which is not emitted in prod. **7.0.1** promoted that log to `WARN` and added the exception class + stack trace.

CloudWatch then revealed `RemoteKeySourceException: Couldn't retrieve remote JWK set: Connect timed out` — the JWKS fetch from `https://www.googleapis.com/oauth2/v3/certs` was timing out. Nimbus's default `RemoteJWKSet` connect/read timeouts are 500 ms each, which a cold App Runner container's first DNS+TLS handshake can plausibly exceed. **7.0.2** raised the timeouts to 3 s.

7.0.2 did not fix the problem. Logs continued to show the same `Connect timed out` after the rolling deploy. That ruled out a tight-timeout interpretation and pointed to a real reachability issue.

`aws apprunner describe-service` showed `EgressConfiguration.EgressType: VPC`, with the service routed through a connector whose subnets had `MapPublicIpOnLaunch: True` and a `0.0.0.0/0 → igw-...` route. That looks like internet access. It isn't — the next section explains why.

## Root cause

App Runner VPC-connector ENIs are placed in your configured subnets but **are never assigned public IPs**. An IGW only NATs traffic from instances with public IPs or Elastic IPs. So every packet leaving the App Runner ENI carried a private source IP, hit the IGW, and was dropped. From inside App Runner, all public-internet egress was a black hole.

This stayed dormant through v6 because nothing in the codebase needed the public internet — Postgres was reachable on a private VPC IP, SES was disabled in non-prod (`notifications.ses.enabled=false`), Google sign-in did not exist. v7.0.0 introduced two new external dependencies, Google's JWKS endpoint and Amazon SES (now enabled in prod via `application-prod.yml`), and both broke for the same reason.

## Options considered

| Option | Cost | Effort | Notes |
|---|---|---|---|
| **A. NAT Gateway** | ~$32/mo + per-GB egress | low | AWS-managed, multi-AZ-capable, no instance to operate. Clean fix. |
| **B. NAT Instance** (`fck-nat` AMI on `t4g.nano`) | ~$4/mo | medium | Same effect, much cheaper. Single point of failure unless run multi-AZ. |
| **C. Drop VPC connector, public Postgres** | $0 | low | Move egress to `DEFAULT`, expose DB on the public internet, rely on SSL + strong credentials for security. |
| D. Pre-bundle Google's JWKS in the JAR | $0 | low | Brittle (Google rotates keys ~weekly), and doesn't address SES. |
| E. Roll back v7 Google Sign-In | $0 | low | Kills a shipped feature, doesn't address SES. |

## Decision: Option C

Chosen because:

- Zero ongoing cost, which matters at this scale.
- Postgres was already configured `PubliclyAccessible: true` and the cluster enforces `rds.force_ssl=1`. The only gate keeping it from the public internet was the SG. The change is small, single-axis, and reversible.
- No compliance requirement on this project mandates private databases.
- The marginal incremental risk over the prior posture is "credential brute-force becomes possible from the public internet." That is bounded by master-password strength (32+ char random) and SSL enforcement, both already in place or trivially achievable.

Options A and B remain on the table if the operational profile changes — sustained scan-noise becomes painful, compliance arrives, the user base grows, etc.

## Implementation

Two AWS commands. App Runner does a rolling deploy on the second; the service stays available throughout.

```bash
# 1. Authorize public ingress to Postgres
aws ec2 authorize-security-group-ingress \
  --region us-west-2 \
  --group-id sg-0916f0171f3d3e81a \
  --ip-permissions 'IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=0.0.0.0/0,Description="Public Postgres for App Runner default egress"}]'

# 2. Switch App Runner egress from VPC to DEFAULT
aws apprunner update-service \
  --region us-west-2 \
  --service-arn arn:aws:apprunner:us-west-2:136022486206:service/highschoolhowto-api/94935f8663744265926241dce6252d76 \
  --network-configuration 'EgressConfiguration={EgressType=DEFAULT}'
```

The VPC connector ARN (`arn:aws:apprunner:us-west-2:136022486206:vpcconnector/highschoolhowto_db_connector/1/f0441773698546a88fef46a543bcc656`) can be left in place — it's not billed while detached — or deleted as a cleanup step.

## Security posture

**What's open after this change**: Postgres on `tcp/5432`, world-routable.

**What protects it**:

- Master credentials live only in AWS Secrets Manager (`prod/db-highschoolhowto/postgres-RhWDiW`); App Runner reads them as runtime env via `RuntimeEnvironmentSecrets`.
- `rds.force_ssl=1` enforces TLS at the database — non-SSL connections are rejected.
- The application JDBC URL in `application-prod.yml` includes `?sslmode=require`.
- Storage is encrypted at rest.

**Expected scan traffic**: a few hundred to a few thousand TCP/auth-failure events per day, more or less continuously. This is noise, not compromise — automated scanners cannot brute-force a 32+ char random master password in any meaningful timeframe. The realistic remaining failure mode is credential leak (e.g., a `.env` file landing in a public commit).

**Optional companion mitigations** (none of which gate this rollout):

- Rotate the Postgres master password to a fresh 32+ char random string.
- Move Postgres to a non-default port (e.g., 54320) — the same SG rule, just a different port — to cut opportunistic scan volume by ~95%. Requires updating `SPRING_DATASOURCE_URL` in `application-prod.yml`.
- Enable IAM database authentication so the application uses short-lived AWS-signed tokens instead of a long-lived password.

## Reversibility

Both changes can be reversed in seconds:

```bash
# Revoke public ingress
aws ec2 revoke-security-group-ingress \
  --region us-west-2 \
  --group-id sg-0916f0171f3d3e81a \
  --protocol tcp --port 5432 --cidr 0.0.0.0/0

# Reattach VPC connector
aws apprunner update-service \
  --region us-west-2 \
  --service-arn arn:aws:apprunner:us-west-2:136022486206:service/highschoolhowto-api/94935f8663744265926241dce6252d76 \
  --network-configuration 'EgressConfiguration={EgressType=VPC,VpcConnectorArn=arn:aws:apprunner:us-west-2:136022486206:vpcconnector/highschoolhowto_db_connector/1/f0441773698546a88fef46a543bcc656}'
```

## Follow-ups

- **`api/scripts/aws-apprunner-setup.sh`** still provisions a VPC connector for new environments. It should be rewritten to use default egress + a public-Postgres SG rule out of the box, so that re-running the script on a new account doesn't reproduce today's bug.
- **The 3-second JWKS-fetch timeout from 7.0.2** (`GoogleIdTokenVerifier.java`) is inert under this architecture — App Runner reaches Google's JWKS endpoint in under 100 ms via default egress. It is harmless and provides a small safety margin against cold-start network variance, so it is staying.
- **Frontend error humanization** (`login.component.ts:95-108`) maps any 401 from either auth endpoint to "We could not match that email/password," which misdirected the early investigation. A small split — branching on which endpoint failed — would have shown "Google Sign-In failed" the first time and saved a step.
- **Master password rotation** is a sensible companion to publishing the DB to the internet. Recommend doing this once with the new posture in place.

## Postmortem notes

**What went well**

- Diagnostic-logging promotion in 7.0.1 was the single highest-leverage step. Surfacing the real Nimbus exception named the egress problem directly.
- Three patches were each small, scoped, reversible.
- AWS-side changes are reversible in seconds — no need for a rollback plan beyond the inverse commands.

**What we'd do differently**

- A staging environment that exercises external dependencies (Google's JWKS endpoint, SES) end-to-end would have caught the egress problem before v7.0.0 shipped to prod.
- 7.0.1 (logging) and 7.0.2 (timeout) were necessary for diagnosis but shipped ahead of full understanding. Better up-front exception logging in `GoogleIdTokenVerifier` from day one would have collapsed both into a single, decisive 7.0.1.
- The frontend's lossy 401 → "email/password" message added confusion. Endpoint-aware error rendering is cheap and worth doing.
