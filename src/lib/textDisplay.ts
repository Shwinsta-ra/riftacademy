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
