/** Turn scraped Markdown into readable plain text: keep link/label text, drop URLs, images and markup. */
export function markdownToText(md: string) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]\s|\d+\.\s)\s*/gm, "")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/\|/g, " ")
    .replace(/^[\s:-]+$/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
