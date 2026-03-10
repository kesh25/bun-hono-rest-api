import { mailcowAxios } from "./mailcow-axios";

const MAIL_HOST = Bun.env.MAILCOW_MAIL_HOST!;
// e.g. mail.vumail.co.ke

const DMARC_RUA = Bun.env.DMARC_RUA_EMAIL;
// e.g. dmarc@vumail.co.ke (optional)

async function getDKIM(domain: string) {
  const res = await mailcowAxios.get(`/get/dkim/${domain}`);
  return res.data;
}

export async function getDomainDNS(domain: string) {
  const dkimRecords = await getDKIM(domain);

  return {
    domain,

    mx: [
      {
        type: "MX",
        host: "@",
        value: MAIL_HOST,
        priority: 10,
        source: "derived",
      },
    ],

    autodiscover: [
      {
        type: "CNAME",
        host: "autodiscover",
        value: MAIL_HOST,
        source: "derived",
      },
      {
        type: "SRV",
        host: "_autodiscover._tcp",
        value: MAIL_HOST,
        port: 443,
        priority: 0,
        weight: 0,
        source: "derived",
      },
      {
        type: "CNAME",
        host: "autoconfig",
        value: MAIL_HOST,
        source: "derived",
      },
    ],

    spf: {
      type: "TXT",
      host: "@",
      value: `v=spf1 mx -all`,
      source: "suggested",
    },

    dmarc: {
      type: "TXT",
      host: "_dmarc",
      value: `v=DMARC1;p=none;pct=100${
        DMARC_RUA ? `;rua=mailto:${DMARC_RUA}` : ""
      }`,
      source: "suggested",
    },

    dkim: {
      type: "TXT",
      host: `${dkimRecords.dkim_selector}._domainkey`,
      value: dkimRecords.dkim_txt,
      keyLength: dkimRecords.length,
      source: "mailcow",
    },
  };
}
