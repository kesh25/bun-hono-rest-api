import dns from "dns/promises";

export async function verifyTXT(domain: string, token: string) {
  const records = await dns.resolveTxt(domain);

  for (const entry of records) {
    if (entry.join("").includes(token)) {
      return true;
    }
  }

  return false;
}
