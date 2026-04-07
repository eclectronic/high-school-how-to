# DNS Configuration — highschoolhowto.com

The `highschoolhowto.com` domain is managed via **AWS Route 53** as a hosted zone (`Z02962841ZJKTDZDQ8FUM`). All DNS changes should be made there.

---

## Website

The frontend is served from S3 via CloudFront. Both the apex domain and `www` subdomain point to the same CloudFront distribution.

| Name | Type | Value |
|------|------|-------|
| `@` | A (Alias) | `d2qvhkvb639m0a.cloudfront.net` |
| `@` | AAAA (Alias) | `d2qvhkvb639m0a.cloudfront.net` |
| `www` | A (Alias) | `d2qvhkvb639m0a.cloudfront.net` |
| `www` | AAAA (Alias) | `d2qvhkvb639m0a.cloudfront.net` |

The ACM certificate for `highschoolhowto.com` is validated via DNS:

| Name | Type | Value |
|------|------|-------|
| `_a5a555bc5c6fe33dea90d032cf9ce6ff` | CNAME | `_80a335bbcaa7936fc50b08c2c8d35979.jkddzztszm.acm-validations.aws.` |

---

## API

The backend API runs on AWS App Runner and is exposed at `api.highschoolhowto.com`. The ACM certificate for the `api` subdomain is also validated via DNS.

| Name | Type | Value |
|------|------|-------|
| `api` | CNAME | `3tmc22arrq.us-west-2.awsapprunner.com` |
| `_80c2a44abcbf0f120f4f457e8e8b49de.8rtd43fquintrxmdfadxhzvsvrbkcp4.api` | CNAME | `_2d8d7cfc4dd2f618f5424c4eaba1ca31.jkddzztszm.acm-validations.aws.` |
| `_7c39a451d43473729ae8cc1c571769ad.api` | CNAME | `_7673c538fd08b5d64f17c13958be96fa.jkddzztszm.acm-validations.aws.` |

---

## Email

### Inbound (MX)

Inbound email is routed through Proofpoint/GoDaddy mail servers.

| Name | Type | Priority | Value |
|------|------|----------|-------|
| `@` | MX | 0 | `mx1-usg2.ppe-hosted.com` |
| `@` | MX | 0 | `mx2-usg2.ppe-hosted.com` |
| `@` | MX | 0 | `mx3-usg2.ppe-hosted.com` |

### Outbound Authentication

**SPF** — authorizes AWS SES (transactional app emails) and the GoDaddy/Proofpoint mail servers (mailbox email) to send on behalf of the domain:

| Name | Type | Value |
|------|------|-------|
| `@` | TXT | `v=spf1 include:amazonses.com include:_spf-usg2.ppe-hosted.com include:secureserver.net ~all` |

**DKIM** — three CNAME records for AWS SES signing:

| Name | Type | Value |
|------|------|-------|
| `6hswyb34txymjwwis66pkwga6qywdynw._domainkey` | CNAME | `6hswyb34txymjwwis66pkwga6qywdynw.dkim.amazonses.com` |
| `i5ytv5jeyfvs6gdddvxoledauquubwyg._domainkey` | CNAME | `i5ytv5jeyfvs6gdddvxoledauquubwyg.dkim.amazonses.com` |
| `lt64ufywviwxxspm23o7ps73fujmlapi._domainkey` | CNAME | `lt64ufywviwxxspm23o7ps73fujmlapi.dkim.amazonses.com` |

> **Note**: DKIM records for the GoDaddy/Proofpoint mail provider have not yet been added. These are typically provided in the email provider's setup wizard and should be added to improve deliverability for mailbox email.

**DMARC** — instructs receiving servers to quarantine mail that fails SPF/DKIM, with aggregate reports sent to `admin@highschoolhowto.com`:

| Name | Type | Value |
|------|------|-------|
| `_dmarc` | TXT | `v=DMARC1; p=quarantine; rua=mailto:admin@highschoolhowto.com; pct=100` |

### Microsoft 365

A tenant verification TXT record and Autodiscover CNAME for Microsoft 365:

| Name | Type | Value |
|------|------|-------|
| `@` | TXT | `NETORG19843243.onmicrosoft.com` |
| `autodiscover` | CNAME | `autodiscover.outlook.com` |

### Email Relay

Used by the GoDaddy email platform for outbound relay:

| Name | Type | Value |
|------|------|-------|
| `email` | CNAME | `email.secureserver.net` |
