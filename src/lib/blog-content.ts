/**
 * Converts legacy HTML into safe, readable plain text. It intentionally does
 * not render any supplied tags, attributes, styles, scripts, or external embeds.
 */
export function sanitizeBlogToParagraphs(value: string): string[] {
  const decoded = value
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\?(?:xml)[^>]*\?>/gi, "")
    .replace(/<\/(?:p|h[1-6]|li|tr|section|div|table)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return decoded.split(/\n+/).map((line) => line.replace(/\s+/g, " ").trim()).filter((line) => line.length > 1);
}
