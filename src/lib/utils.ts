export function extractNameFromEmail(email: string): string {
  if (!email || !email.includes("@")) return "";

  const localPart = email.split("@")[0];

  return (
    localPart
      // replace separators with space
      .replace(/[._-]+/g, " ")
      // remove numbers
      .replace(/\d+/g, "")
      // trim
      .trim()
      // capitalize words
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  );
}
