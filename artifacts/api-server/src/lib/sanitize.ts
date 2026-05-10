import sanitizeHtml from "sanitize-html";

export function sanitizeString(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  
  const sanitized = sanitizeHtml(input, {
    allowedTags: [], // Strip all HTML tags
    allowedAttributes: {},
  }).trim();

  return sanitized.length > 0 ? sanitized : undefined;
}

export function validateEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Robust email regex pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}

export function validateWebsiteUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (e) {
    return false;
  }
}
