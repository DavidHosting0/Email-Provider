# Amazon SES Setup Guide

This guide walks through configuring Amazon SES for outbound SMTP relay and inbound email receiving for MailPlatform.

## Prerequisites

- AWS account with SES access
- A domain you control (per tenant organization)
- MailPlatform API deployed and reachable via HTTPS

## 1. Request Production Access

SES starts in sandbox mode (can only send to verified addresses). Request production access:

1. Open **Amazon SES** → **Account dashboard**
2. Click **Request production access**
3. Describe your use case (transactional/organizational email)
4. Wait for approval (usually 24 hours)

## 2. Verify Domain Identity

For each tenant domain:

1. SES → **Verified identities** → **Create identity**
2. Choose **Domain**
3. Enter the domain (e.g. `example.com`)
4. Enable **DKIM** (Easy DKIM, 2048-bit)
5. Copy the 3 DKIM CNAME tokens and add them to the domain settings in MailPlatform

Update the domain record in MailPlatform with DKIM tokens once received from SES.

## 3. DNS Records

Add these records to your domain's DNS zone:

### SPF

| Type | Name | Value |
|------|------|-------|
| TXT | `example.com` | `v=spf1 include:amazonses.com ~all` |

### DKIM (3 records from SES console)

| Type | Name | Value |
|------|------|-------|
| CNAME | `<token1>._domainkey.example.com` | `<token1>.dkim.amazonses.com` |
| CNAME | `<token2>._domainkey.example.com` | `<token2>.dkim.amazonses.com` |
| CNAME | `<token3>._domainkey.example.com` | `<token3>.dkim.amazonses.com` |

### DMARC

| Type | Name | Value |
|------|------|-------|
| TXT | `_dmarc.example.com` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com` |

### MX (Inbound)

| Type | Name | Priority | Value |
|------|------|----------|-------|
| MX | `example.com` | 10 | `inbound-smtp.eu-central-1.amazonaws.com` |

Replace `eu-central-1` with your SES region.

MailPlatform's **Settings → Domains** page shows these records dynamically per domain.

## 4. SMTP Credentials (Outbound)

1. SES → **SMTP settings** → **Create SMTP credentials**
2. Save the **SMTP username** and **SMTP password**
3. Add to `.env`:

```
SES_REGION=eu-central-1
SES_SMTP_USER=AKIA...
SES_SMTP_PASS=...
```

All outbound email from MailPlatform flows through this SMTP endpoint with TLS on port 587.

## 5. Inbound Email (SES Receipt Rules)

### Create S3 Bucket

1. Create an S3 bucket (e.g. `mailplatform-inbound-emails`)
2. Block public access
3. Add bucket policy allowing SES to write:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ses.amazonaws.com" },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::mailplatform-inbound-emails/*",
      "Condition": {
        "StringEquals": { "AWS:SourceAccount": "YOUR_AWS_ACCOUNT_ID" }
      }
    }
  ]
}
```

### Create SNS Topic

1. Create SNS topic: `mailplatform-inbound-email`
2. Create HTTPS subscription:
   - Endpoint: `https://mail.yourdomain.com/api/v1/webhooks/ses/inbound`
   - SNS will send a subscription confirmation; the API auto-confirms

### Create Receipt Rule Set

1. SES → **Email receiving** → **Rule sets** → Create active rule set
2. Add rule:
   - **Recipients**: `example.com` (or specific addresses)
   - **Actions**:
     1. **S3**: bucket = `mailplatform-inbound-emails`, prefix = `inbound/`
     2. **SNS**: topic = `mailplatform-inbound-email`

### Environment Variables

```
SES_INBOUND_S3_BUCKET=mailplatform-inbound-emails
SES_INBOUND_SNS_TOPIC_ARN=arn:aws:sns:eu-central-1:123456789:mailplatform-inbound-email
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## 6. Bounce and Complaint Handling

1. SES → **Configuration sets** → Create set (e.g. `mailplatform`)
2. Add event destinations:
   - **Bounce** → SNS topic → HTTPS subscription to `/api/v1/webhooks/ses/events`
   - **Complaint** → SNS topic → same endpoint
   - **Delivery** → SNS topic → same endpoint (optional)

Events are stored in the `ses_events` table for monitoring.

## 7. IAM Permissions

Minimum IAM policy for the application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendRawEmail", "ses:SendEmail"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::mailplatform-inbound-emails/*"
    }
  ]
}
```

## 8. Verification Checklist

- [ ] Domain verified in SES (DKIM status: Success)
- [ ] SPF, DKIM, DMARC DNS records published
- [ ] MX record points to SES inbound endpoint
- [ ] SMTP credentials in `.env`
- [ ] S3 bucket + receipt rule configured
- [ ] SNS webhook subscriptions confirmed
- [ ] Test outbound: send from webmail compose
- [ ] Test inbound: send email to `info@example.com` from external account
- [ ] Production access granted (not sandbox)
