import type { DnsRecord } from '@email-provider/shared';
import { getSesInboundMx } from '@email-provider/shared';

export function getDnsInstructions(
  domain: string,
  region: string,
  dkimTokens: string[] = [],
): DnsRecord[] {
  const records: DnsRecord[] = [
    {
      type: 'TXT',
      name: domain,
      value: 'v=spf1 include:amazonses.com ~all',
      purpose: 'SPF — authorize Amazon SES to send on behalf of this domain',
    },
    {
      type: 'TXT',
      name: `_dmarc.${domain}`,
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
      purpose: 'DMARC — email authentication policy',
    },
    {
      type: 'MX',
      name: domain,
      value: `10 ${getSesInboundMx(region)}`,
      purpose: 'MX — route inbound email to Amazon SES',
    },
  ];

  for (const token of dkimTokens) {
    records.push({
      type: 'CNAME',
      name: `${token}._domainkey.${domain}`,
      value: `${token}.dkim.amazonses.com`,
      purpose: 'DKIM — email signing verification',
    });
  }

  if (dkimTokens.length === 0) {
    records.push({
      type: 'CNAME',
      name: `<token>._domainkey.${domain}`,
      value: '<token>.dkim.amazonses.com',
      purpose: 'DKIM — add 3 CNAME records from SES console after domain verification',
    });
  }

  return records;
}
