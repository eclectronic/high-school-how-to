# high-school-how-to — Hosting how-to for highschoolhowto.com

This document describes step-by-step instructions to host a static website for
`highschoolhowto.com` and `www.highschoolhowto.com` on AWS using S3, CloudFront,
ACM (TLS), and Route 53 (DNS). It includes both Console and AWS CLI examples,
testing tips, an optional www->apex redirect, and cleanup/cost/security notes.

## Goal

Serve a static website available at:

- https://highschoolhowto.com
- https://www.highschoolhowto.com

Using:

- Amazon S3 for storing static files
- Amazon CloudFront as CDN and HTTPS endpoint
- AWS Certificate Manager (ACM) for TLS certificates (must request in us-east-1
	for CloudFront)
- Amazon Route 53 for DNS (recommended)

## Assumptions & prerequisites

- You control the domain `highschoolhowto.com` and can add DNS records.
- Preferably the domain is hosted in Route 53 (makes DNS validation and alias
	records easier). If hosted elsewhere you'll create DNS records at your
	registrar.
- You have an AWS account with permissions to create S3, CloudFront, ACM (in
	`us-east-1`), Route 53 and IAM policies. If unsure, use an admin account for
	initial setup.
- AWS CLI (v2) is installed and configured locally if you want to run the CLI
	commands in this guide.
- Website files are ready (e.g., `index.html`, assets). We'll upload them to S3.

If any assumptions are false, adapt the steps (I can help with that).

## High-level plan

1. Create a private S3 bucket for your site content and upload files.
2. Request an ACM certificate (in `us-east-1`) for both `highschoolhowto.com`
	 and `www.highschoolhowto.com` using DNS validation.
3. Create a CloudFront distribution using the S3 bucket as origin, attach the
	 ACM certificate, and add both domain names as Alternate Domain Names.
4. Create Route 53 records (alias A records) for apex and `www` pointing to
	 the CloudFront distribution.
5. Test and verify. Optionally set up `www` -> apex redirect if you prefer.

Notes:
- For CloudFront you should keep the S3 bucket private and grant CloudFront an
	Origin Access Control (OAC) or Origin Access Identity (OAI) so only CloudFront
	can read the bucket.
- ACM certificates used by CloudFront must be requested in `us-east-1`.

---

## Detailed steps

### 1 — Create the S3 bucket (private) and upload files

Recommended: keep the bucket private and let CloudFront read objects through an
Origin Access Control (OAC). The bucket name does not have to match your
domain. Example bucket name: `highschoolhowto-static-content`.

Console (quick):
1. Open S3 in the AWS Console and click Create bucket.
2. Enter a name (e.g. `highschoolhowto-static-content`) and choose a region.
3. Keep "Block all public access" enabled (we'll use CloudFront to fetch
	 objects).
4. Create the bucket and upload your site files (e.g. `index.html`, css, js,
	 images).

CLI example:

```bash
aws s3api create-bucket --bucket highschoolhowto-static-content \
	--region us-west-2 --create-bucket-configuration LocationConstraint=us-west-2

# upload files from local ./site folder
aws s3 cp ./site/ s3://highschoolhowto-static-content/ --recursive
```

Notes:
- Do not enable S3 static website hosting unless you plan to use the S3
	website endpoint (we'll front S3 with CloudFront).
- Keep the bucket private and restrict direct public access.

### 2 — Request an ACM certificate (us-east-1) with DNS validation

ACM certificates used by CloudFront must be requested in the N. Virginia
region (`us-east-1`). Use DNS validation so Route 53 can automatically create
the needed records.

Console:
1. Switch the AWS Console region to US East (N. Virginia) — `us-east-1`.
2. Open ACM → Request a certificate → Request a public certificate.
3. Add domain names:
	 - `highschoolhowto.com`
	 - `www.highschoolhowto.com`
4. Choose DNS validation and request the certificate.
5. If your hosted zone is in Route 53 in the same account, use the "Create
	 record in Route 53" button to auto-create validation records. Otherwise,
	 create the CNAME records your ACM request outputs at your DNS provider.

CLI (request certificate):

```bash
aws acm request-certificate \
	--region us-east-1 \
	--domain-name highschoolhowto.com \
	--subject-alternative-names "www.highschoolhowto.com" \
	--validation-method DNS \
	--idempotency-token highschoolhowto-2025
```

Then inspect the validation options to get the CNAME records:

```bash
aws acm describe-certificate --region us-east-1 --certificate-arn <CERT_ARN>
```

If your hosted zone is in Route 53 you can create the validation records
automatically (Console) or use `aws route53 change-resource-record-sets` to add
the CNAME records returned by ACM. Wait until the certificate status becomes
ISSUED.

If your DNS is at another registrar (e.g., GoDaddy), keep using DNS validation:

1. In ACM (still `us-east-1`), request the certificate and copy the CNAMEs ACM
   shows for each name (`highschoolhowto.com` and `www.highschoolhowto.com`).
2. In GoDaddy: Domains → DNS → Manage DNS for `highschoolhowto.com` → Add
   record → type `CNAME`. Paste ACM's `Name` into Host and `Value` into
   Points-to/Target. Save. Repeat for the `www` entry if ACM issued two CNAMEs.
3. Keep the CNAMEs in place. ACM will flip to ISSUED once they propagate; you
   can verify visibility with `dig <acm-name> CNAME`.

### 3 — Create the CloudFront distribution

The CloudFront distribution provides the HTTPS endpoint and maps your domain
names to the S3 origin.

Console (recommended flow):
1. Open CloudFront (global) in the Console and Create distribution.
2. Origin domain: choose the S3 bucket you created (it appears as an S3
	 origin). Use the *S3 bucket (not the website endpoint)* as the origin.
3. For Origin access: enable Origin access control (OAC) or the older OAI
	 method. Allow CloudFront to update your bucket policy automatically so only
	 CloudFront can read objects.
4. Default behavior: Viewer protocol policy = Redirect HTTP to HTTPS.
5. Alternate Domain Names (CNAMEs): add `highschoolhowto.com` and
	 `www.highschoolhowto.com`.
6. SSL Certificate: choose Custom SSL certificate and select the ACM cert you
	 issued in `us-east-1`.
7. Default root object: `index.html`.
8. Create distribution and wait for status to become Deployed.

If you enabled OAC/OAI, CloudFront will either update the bucket policy for you
or provide an identity that you must add to the bucket policy so CloudFront can
GetObject. Example bucket policy (OAI style):

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "GrantCloudFrontAccess",
			"Effect": "Allow",
			"Principal": {
				"AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity E2EXAMPLExxxxx"
			},
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::highschoolhowto-static-content/*"
		}
	]
}
```

Notes:
- CloudFront distribution creation can also be automated with CloudFormation
	or Terraform. If you want, I can generate a template.

### 4 — Create Route 53 DNS records

If your domain is hosted in Route 53:

1. Open Route 53 → Hosted zones → select `highschoolhowto.com`.
2. Create an A (IPv4) record for the apex (`highschoolhowto.com`):
	 - Record type: A
	 - Alias: Yes
	 - Alias target: choose the CloudFront distribution (CloudFront's domain
		 will appear in the dropdown)
3. Create an A record for `www.highschoolhowto.com` with the same alias target.

CLI example (replace placeholders):

```bash
# find your hosted zone id first
aws route53 list-hosted-zones-by-name --dns-name highschoolhowto.com

# create alias change batch file (edit DNSName to your CloudFront domain)
cat > alias-change.json <<EOF
{
	"Comment": "Create alias to CloudFront distribution",
	"Changes": [
		{
			"Action": "UPSERT",
			"ResourceRecordSet": {
				"Name": "highschoolhowto.com.",
				"Type": "A",
				"AliasTarget": {
					"HostedZoneId": "Z2FDTNDATAQYW2",
					"DNSName": "d12345678abcdef.cloudfront.net.",
					"EvaluateTargetHealth": false
				}
			}
		},
		{
			"Action": "UPSERT",
			"ResourceRecordSet": {
				"Name": "www.highschoolhowto.com.",
				"Type": "A",
				"AliasTarget": {
					"HostedZoneId": "Z2FDTNDATAQYW2",
					"DNSName": "d12345678abcdef.cloudfront.net.",
					"EvaluateTargetHealth": false
				}
			}
		}
	]
}
EOF

aws route53 change-resource-record-sets --hosted-zone-id Z123456789ABCDEFG --change-batch file://alias-change.json
```

Notes:
- `Z2FDTNDATAQYW2` is the common CloudFront Hosted Zone ID used in AliasTarget
	records; Route 53 Console will set this automatically when you pick the
	CloudFront distribution as alias target.
- If your DNS is hosted outside Route 53, create an ALIAS/ANAME (if supported)
	or set `www` as a CNAME to the CloudFront domain (`dxxxx.cloudfront.net`).
	Apex records at external providers are sometimes limited — consider moving
	DNS to Route 53 if you need an alias at the apex.

### 5 — Test and verify

Commands:

```bash
# DNS checks
dig +short highschoolhowto.com
dig +short www.highschoolhowto.com

# HTTP checks
curl -I https://highschoolhowto.com
curl -I https://www.highschoolhowto.com

# fetch page
curl https://highschoolhowto.com -s | head -n 50
```

What to expect:
- ACM certificate status should be ISSUED (in `us-east-1`).
- CloudFront distribution status should be Deployed.
- Visiting https://highschoolhowto.com and https://www.highschoolhowto.com
	should serve your `index.html` over HTTPS with a valid certificate.

Common issues:
- Certificate PendingValidation: create the DNS validation records in the
	correct hosted zone and wait for propagation.
- 403 AccessDenied from CloudFront: bucket policy doesn't allow the CloudFront
	identity to GetObject. Re-check OAI/OAC and the bucket policy or let the
	console update the policy automatically.
- DNS not resolving: verify the Route 53 records and TTL; check the
	CloudFront domain name used in the alias.

### 6 — Optional: Redirect `www` → apex (if you prefer redirects)

If you prefer `www.highschoolhowto.com` to redirect to `highschoolhowto.com`, a
simple way is to create a second S3 bucket (named exactly `www.highschoolhowto.com`) and
enable static website hosting with redirect rules. Then front that bucket with
a CloudFront distribution (or use Route 53+S3 website endpoint if you accept
HTTP-only redirects). For HTTPS redirects you must place CloudFront in front of
the S3 website endpoint and attach an ACM certificate that covers `www`.

Short outline:
1. Create S3 bucket `www.highschoolhowto.com` and enable static website hosting
	 to redirect to `https://highschoolhowto.com`.
2. Create CloudFront distribution using the S3 website endpoint as a custom
	 origin, attach ACM cert for `www`, and set viewer protocol to HTTPS.
3. Point `www` record in Route 53 to this CloudFront distribution.

Alternative advanced option: use a Lambda@Edge function on CloudFront to
issue a 301 redirect for requests to `www`.

### 7 — Deployments and invalidation

- When you update files in S3, CloudFront caches may still serve old content.
	Invalidate the distribution to force retrieval of new files:

```bash
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

- For automation, add a CI step (GitHub Actions, CodeBuild, etc.) to upload to
	S3 and create an invalidation.

### 8 — Cleanup, cost & security notes

- Costs: S3 storage & requests, CloudFront data transfer & requests, Route 53
	hosted zone fee. ACM public certificates are free.
- Cleanup steps (if you want to delete everything):
	1. Delete CloudFront distribution (disable then delete). Wait for it to be
		 fully deleted.
	2. Remove Route 53 records and hosted zone if desired.
	3. Empty and delete S3 buckets.
	4. Delete the ACM certificate in `us-east-1`.
- Security: keep the S3 bucket private and use OAC/OAI so only CloudFront can
	access it. Use least-privilege IAM policies for any automation user.

## Troubleshooting checklist

- If ACM stays PendingValidation: verify the CNAME records were added to the
	correct hosted zone and propagated.
- If CloudFront shows 403: check S3 bucket policy for the CloudFront identity.
- If DNS doesn't resolve: verify the Route 53 records and TTL; check the
	CloudFront domain name used in the alias.

## Next steps I can help with

- Generate a CloudFormation or Terraform template that provisions S3,
	CloudFront, ACM and Route 53 records automatically.
- Create the Route 53 DNS validation records and ACM certificate for you (I
	can provide exact CLI commands or a change batch once you give the
	certificate ARN or hosted zone id).
- Upload a sample `index.html` to S3, create the CloudFront distribution, and
	wire DNS for you (requires you to run the CLI commands or provide access).

---

If you want this saved exactly as a `README.md` or another filename, or want
me to generate an automation template (CloudFormation/Terraform) next, tell me
which and I will create it.
