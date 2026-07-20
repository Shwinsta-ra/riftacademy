// Card text from the source data uses placeholder tokens like ":rb_might:"
// for icons that don't have art assets in this app yet. Map the ones we
// know about to readable text; extend this as more icon assets get added
// (or swapped for real images) later.
const ICON_TEXT_MAP: Record<string, string> = {
  ":rb_might:": "(Might)",
  ":rb_rune_rainbow:": "(Rune)",
};

export function humanizeCardText(text: string): string {
  let out = text;
  for (const [token, replacement] of Object.entries(ICON_TEXT_MAP)) {
    out = out.split(token).join(replacement);
  }
  return out;
}

/** Joins the last two words with a non-breaking space, so a wrapped line
 *  never strands a single word by itself (e.g. "...card's / text?" becomes
 *  "...card's text?", which wraps as "...card's / text?" only if BOTH words
 *  don't fit -- otherwise the wrap point naturally lands a word earlier,
 *  leaving two words on the last line instead of one). RN text layout has
 *  no built-in balanced-wrap, so this is the standard trick: prevent the
 *  final break point rather than try to predict where the others fall. */
export function preventOrphanWord(text: string): string {
  const lastSpace = text.lastIndexOf(" ");
  if (lastSpace === -1) return text;
  return text.slice(0, lastSpace) + "\u00A0" + text.slice(lastSpace + 1);
}
