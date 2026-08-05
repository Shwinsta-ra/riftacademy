# Thread/topic: riot-domain-verification

**Sections likely affected:** 2 (shipped), 9 (log), standing conventions

**Customer-facing:**
Nothing user-visible.

**Team-facing:**
Added `public/riot.txt` containing only Riot's domain-verification token (`9d4118de-…d71c`, 37 bytes = UUID + one `\n`, no BOM, no surrounding whitespace) so `https://riftacademy-tau.vercel.app/riot.txt` verifies the domain on Riot's developer portal.

This creates the repo's **first `public/` directory**. Expo SDK 54's `expo export --platform web` copies everything under `public/` verbatim to the root of `dist/`. Verified: `dist/riot.txt` is byte-identical to the source after a local export. Note that `expo export`'s "Files (N)" summary line does **not** list `public/` passthrough assets — it only counted `index.html` and `metadata.json`, so read the actual `dist/` listing rather than trusting that summary.

No rewrite exclusion was needed. `vercel.json` has no `rewrites`/`redirects`/`routes` block, and production was probed directly to confirm there is no SPA catch-all: `curl -D -` on an unknown path returns a genuine Vercel `404` with `x-vercel-error: NOT_FOUND`, not a rewritten `index.html`. Static files at the output root therefore serve directly, with Vercel deriving `Content-Type: text/plain` from the `.txt` extension.

`public/` is excluded by neither `.gitignore` (`git check-ignore` exits 1) nor `.vercelignore` (which lists only `node_modules`, `dist`, `.expo`, `scripts`).

**New standing rule or convention worth capturing:**
Static files that must be served verbatim at the web root (domain-verification tokens, `robots.txt`, `.well-known/*`) go in `public/` at the project root — not in `dist/` (gitignored, rebuilt every deploy) and not in `src/assets/`.

Corollary, worth remembering before anyone adds SPA deep-link routing: this app currently has **no catch-all rewrite**, which is exactly why `/riot.txt` works. If a future change adds one to make deep links resolve to `index.html`, it must exclude `/riot.txt` (and any other root static file) ahead of the catch-all, or Riot's verification silently starts returning HTML and fails.

**Anything another thread working today should know:**
The token only takes effect on `riftacademy-tau.vercel.app` once this reaches `main` — i.e. after the normal `integration → beta → staging → main` promotion. Post-deploy check:

```
curl -sD - https://riftacademy-tau.vercel.app/riot.txt
```

Expect `200`, `content-type: text/plain`, and the bare token as the body.
