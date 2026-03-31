# AWS setup (App Runner + custom domain)

Steps to run the API on AWS App Runner and expose it at `highschoolhowto.com` behind HTTPS.

## App Runner + CloudFront for highschoolhowto.com (ECR-backed)
Use this flow when you want App Runner behind CloudFront for `highschoolhowto.com` (and `www`) with an image hosted in ECR.

### Prerequisites
- Domain `highschoolhowto.com` in Route 53 (or ability to create the DNS records elsewhere).
- AWS CLI v2 configured; permissions for ECR, App Runner, ACM, CloudFront, and Route 53.
- CloudFront requires its ACM certificate in `us-east-1`.

### 1) Build and push to ECR (example region `us-west-2`)
```bash
aws ecr create-repository \
  --repository-name highschoolhowto/api \
  --image-scanning-configuration scanOnPush=true \
  --region us-west-2

aws ecr get-login-password --region us-west-2 \
  | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com

docker build --platform linux/amd64 -t highschoolhowto/api .
docker tag highschoolhowto/api:latest $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/highschoolhowto/api:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/highschoolhowto/api:latest
```

### 2) Create the App Runner service from ECR
- Source: choose the ECR image above; enable automatic deployments on new images if desired.
- Port: 8080.
- Env vars: set `SPRING_PROFILES_ACTIVE=prod` plus DB/secret values.
- Auto-scaling: adjust min/max concurrency to fit traffic.
- Name the App Runner service `api` to keep DNS/identity consistent.
- Note the App Runner default domain (e.g., `abcdefghij.us-west-2.awsapprunner.com`); CloudFront will point to this.
- App Runner images must be `linux/amd64` (x86_64); add `--platform linux/amd64` when building if you are on Apple Silicon/ARM.

### 3) Request ACM certificate for apex + www (must be `us-east-1`)

NOTE: didn't need to do this because this cert was already created when cloudfront was set up
 
```bash
aws acm request-certificate \
  --region us-east-1 \
  --domain-name highschoolhowto.com \
  --subject-alternative-names www.highschoolhowto.com \
  --validation-method DNS \
  --idempotency-token highschoolhowto_api
```
- In ACM, create the DNS validation CNAMEs:
  - Console: open the certificate → **Create records in Route 53** to auto-add the CNAMEs. If not available, copy each `Name`/`Value` pair exactly (no trimming) into Route 53 as CNAME records.
  - CLI (to view the records): `aws acm describe-certificate --region us-east-1 --certificate-arn <ARN> --query 'Certificate.DomainValidationOptions[].ResourceRecord'`
  - Wait for status **ISSUED** after the CNAMEs propagate.

### 4) Create CloudFront distribution in front of App Runner
- Origin: custom origin `https://<apprunner-default-domain>`; force HTTPS.
- Origin request policy: include the Host header if the app needs host awareness; otherwise minimal headers/cookies.
- Cache policy: start with `CachingDisabled` for dynamic API responses; add path-based caching for static assets if applicable.
- Viewer: Redirect HTTP → HTTPS; allowed methods GET/HEAD (add POST/etc. if needed).
- Alternate domain names: `highschoolhowto.com`, `www.highschoolhowto.com`.
- SSL cert: select the `us-east-1` ACM cert from step 3.
- Default root object: set if serving a SPA (e.g., `index.html`).
- After deploy, record the CloudFront domain `dxxxx.cloudfront.net`.

#### Add a `/api/*` behavior to route to App Runner (if you already have CloudFront)
Use this when a CloudFront distribution already exists and you want `/api/*` forwarded to the App Runner service while keeping static/site traffic on your existing origin.

- Add an origin for App Runner: domain = your App Runner default domain (e.g., `abcdefghij.us-west-2.awsapprunner.com`), protocol = HTTPS only.
- Create a behavior with:
  - Path pattern: `/api/*`
  - Origin: the App Runner origin above
  - Viewer protocol: Redirect HTTP to HTTPS
  - Allowed methods: at least GET/HEAD; add POST/PUT/PATCH/DELETE/OPTIONS if the API needs them.
  - Cache policy: `CachingDisabled` (or a custom policy that bypasses cache and includes all headers/query strings your API needs).
  - Origin request policy: include Host header and any auth headers/cookies required by the API.
  - Compress objects: optional; can stay enabled.
- Keep your default behavior pointing to the existing static origin for non-API paths.

### 5) Route 53 DNS to CloudFront
- In hosted zone `highschoolhowto.com`, create:
  - `A` and `AAAA` alias for apex pointing to the CloudFront distribution.
  - `A` and `AAAA` alias for `www` pointing to the same distribution.

### 6) Verify
```bash
curl -I https://highschoolhowto.com
curl -I https://www.highschoolhowto.com
```
- Expect 200/301/302 from your app. If you see 403, ensure CloudFront forwards needed headers/cookies and that the App Runner service is healthy.

### Troubleshooting notes
- Certificate stuck PendingValidation: re-check ACM CNAMEs in the correct hosted zone.
- 403/502: verify App Runner is reachable on port 8080 and CloudFront behavior forwards required headers.
- DNS not resolving: confirm alias targets and that CloudFront is Deployed.

### Automation script
- Script: `api/scripts/aws-apprunner-setup.sh`
- Purpose: end-to-end ECR build/push, App Runner service named `api`, custom domain association, and Route 53 record creation for `highschoolhowto.com`.
- Env file: defaults load from `api/scripts/aws-apprunner-setup.env` (override with `ENV_FILE=...`). Example template: `api/scripts/aws-apprunner-setup.env.example`.
- Auto-generate env file: the script will attempt to derive `AWS_ACCOUNT_ID` (via STS) and `AWS_HOSTED_ZONE_ID` (via Route 53) and write the default env file if it is missing. Ensure your AWS credentials are available to the AWS CLI (default profile, or `AWS_PROFILE=...`, or exported keys from `~/.aws/credentials`) so discovery can succeed.
- Required env before running: `AWS_ACCOUNT_ID`, `AWS_HOSTED_ZONE_ID`, `AWS_APP_RUNNER_ROLE_ARN` (auto-derivation helps fill the first two). Optional: `AWS_REGION`, `AWS_ECR_REPO_NAME`, `AWS_IMAGE_TAG`, `SERVICE_NAME`, `APP_PORT`, `DOMAIN_NAME`.
- Output: creates/uses ECR repo, builds/pushes the image, creates App Runner service, associates the domain, and applies the Route 53 change batch with validation + CNAME records.
- Alternative image build/push with Gradle Jib: from `api/`, run `AWS_PROFILE=<profile> AWS_ACCOUNT_ID=<id> AWS_REGION=us-west-2 AWS_ECR_REPO_NAME=highschoolhowto/api AWS_IMAGE_TAG=latest ./gradlew jib` to build `linux/amd64` and push directly to ECR without separate Docker commands.
- Liquibase: Gradle now has two activities—`createDb` (connects to admin DB, runs `db/changelog/create-database.sql` to create the `highschoolhowto` DB if missing) and `schema` (applies `db.changelog-master.yaml` to the app DB). Default runList is `createDb,schema`; set `LIQUIBASE_*` env vars as needed.

## Prerequisites
- AWS account with permissions for App Runner, ACM, and Route 53.
- Source image available to App Runner (ECR or direct from GitHub); service already created and running.
- Hosted zone for `highschoolhowto.com` in Route 53.

## 1) Create or identify the App Runner service
1. Build and push the backend image to ECR (or connect App Runner directly to the repo).
2. In App Runner, create a service (or update an existing one) pointing to that image/repo:
   - Runtime: container image.
   - CPU/memory: choose as needed.
   - Port: 8080 (the Spring Boot container port).
   - Environment: set `SPRING_PROFILES_ACTIVE=prod` (or your desired profile) and any required secrets/DB URLs.
   - Auto-scaling: optional, adjust min/max concurrency to taste.
   - Note the *default domain* shown after creation (e.g., `abcdefghij.us-west-2.awsapprunner.com`).

## 2) Attach the custom domain `highschoolhowto.com`
1. In App Runner → *Custom domains* → **Add custom domain** → enter `highschoolhowto.com`.
2. App Runner issues/associates an ACM cert automatically and shows required DNS records:
   - One or more validation CNAMEs (Name/Value) for ACM.
   - A target CNAME pointing to the App Runner default domain.

## 3) Create Route 53 records
Hosted zone: `highschoolhowto.com`.

- Add the validation CNAMEs exactly as provided by App Runner (do not edit/shorten them).
- Add the routing record:
  - Record name: `api`
  - Type: `CNAME`
  - Value: `<your-app-runner-default-domain>` (e.g., `abcdefghij.us-west-2.awsapprunner.com`)

Example change batch (replace placeholders before running):

```json
{
  "Comment": "App Runner custom domain for highschoolhowto.com",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "highschoolhowto.com.",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          { "Value": "abcdefghij.us-west-2.awsapprunner.com." }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_<validation>.highschoolhowto.com.",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          { "Value": "_<acm>.acm-validations.aws." }
        ]
      }
    }
  ]
}
```

Apply via CLI:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --change-batch file://change-batch.json
```

## 4) Verify and go live
- In App Runner, watch the custom domain status; it becomes **Active** after ACM validation completes (usually a few minutes once CNAMEs propagate).
- Test over HTTPS: `curl -I https://highschoolhowto.com/api/auth/login`.
- If you rotate images or env vars, redeploy/update the App Runner service; DNS stays the same.

## Troubleshooting
- Status stuck in *Pending validation*: check the validation CNAME is present and matches exactly (no apex trimming).
- SSL errors: ensure you’re hitting `https://highschoolhowto.com` and that the cert shows as issued in the App Runner domain panel.
- 502/503 from App Runner: verify the service port is 8080, health checks are passing, and environment variables are set. Logs live in the App Runner console.

---

## Email notifications via Amazon SES

The API sends transactional emails (email verification, password reset) using Amazon SES v2. App Runner reaches SES via a VPC interface endpoint — no NAT Gateway required.

### Architecture

App Runner (VPC) → VPC interface endpoint (`com.amazonaws.us-west-2.email`) → SES v2 API

### One-time setup (already done for this account)

#### 1) Verify sending domain
```bash
aws sesv2 create-email-identity \
  --region us-west-2 \
  --email-identity highschoolhowto.com
```
This returns 3 DKIM tokens. Add them to Route 53 as CNAME records:
```bash
# For each token:
# Name:  <token>._domainkey.highschoolhowto.com.
# Value: <token>.dkim.amazonses.com
```
Verification is automatic once DNS propagates. Check status:
```bash
aws sesv2 get-email-identity \
  --region us-west-2 \
  --email-identity highschoolhowto.com \
  --query ‘{verified:VerifiedForSendingStatus,dkim:DkimAttributes.Status}’
```
Expected: `{ "verified": true, "dkim": "SUCCESS" }`

#### 2) Grant App Runner instance role permission to send email
```bash
aws iam put-role-policy \
  --role-name AppRunnerInstanceRoleForHighschoolhowto \
  --policy-name SesEmailAccess \
  --policy-document ‘{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }]
  }’
```

#### 3) Create SES VPC interface endpoint
Allows App Runner (in the VPC) to reach SES without internet egress.
```bash
aws ec2 create-vpc-endpoint \
  --region us-west-2 \
  --vpc-id vpc-0ade51e24aed21894 \
  --service-name com.amazonaws.us-west-2.email \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-01457b58369edc3cb subnet-07e7992aa4af672e8 subnet-08f0090c932c8ae92 subnet-0d4dd28bf1b5770c5 \
  --security-group-ids sg-0916f0171f3d3e81a \
  --private-dns-enabled
```
Current endpoint: `vpce-068c9396092433471`

#### 4) Enable SES in App Runner environment
Set the following in the App Runner service configuration (env vars):
```
NOTIFICATIONS_SES_ENABLED=true
```
The Graph/Azure secrets are no longer needed and have been removed.

### SES sandbox vs production

SES accounts start in **sandbox mode** — emails can only be sent to verified addresses.

To send to any address (required for real users):
1. Go to **AWS Console → SES → Account dashboard → Request production access**
2. Fill in use case (transactional: account verification and password reset)
3. AWS approves within ~24 hours

While in sandbox, verify your own email to test:
```bash
aws sesv2 create-email-identity \
  --region us-west-2 \
  --email-identity you@example.com
```
Then click the verification link AWS sends to that address.

### Application configuration

`application.yml` (default — SES disabled, uses logging fallback):
```yaml
notifications:
  ses:
    enabled: false
    region: us-west-2
    from-address: admin@highschoolhowto.com
```

In production, `NOTIFICATIONS_SES_ENABLED=true` is set as an App Runner env var which overrides `notifications.ses.enabled`.

When `enabled: false`, `LoggingNotificationService` is active — it logs verification/reset links instead of sending emails (useful for local dev).

### Troubleshooting
- **MessageRejected: Email address not verified** — account is in sandbox; verify the recipient address or request production access.
- **No route to host / connection timeout** — check the VPC endpoint exists and its security group allows outbound HTTPS (443) to the SES endpoint DNS.
- **AccessDenied** — check the App Runner instance role has the `SesEmailAccess` policy attached.
