## Thread/topic: vercel-web-analytics

**Sections likely affected:** 2 (Shipped features), 9 (log)

**Customer-facing:**
No visible change — this adds anonymous, real-user page-view tracking on the production site so we can see actual traffic. Nothing for a player to notice.

**Team-facing:**
Added `@vercel/analytics` and mounted `<Analytics />` from `@vercel/analytics/react` in the root `App` component (`App.tsx`), gated behind `Platform.OS === "web"`. This app ships native (iOS/Android) builds via Expo alongside the web export that Vercel actually deploys (`vercel.json`: `expo export --platform web`) — Web Analytics is a web-deploy concept, so the native builds shouldn't carry it. Functionally the guard isn't load-bearing (the package's own `isBrowser()` checks make it a safe no-op without `window`), but it keeps the intent explicit and avoids any future library change that assumes a DOM.

**Not yet done — needs Ashwin, one-time, dashboard only:** there is no public Vercel API/CLI endpoint to toggle "Enable Web Analytics" for a project (confirmed via `vercel api list` — only query endpoints like `/v1/query/web-analytics/*` exist, nothing to flip the setting itself). Ashwin needs to enable it manually: Vercel dashboard → riftacademy project → Analytics tab → Enable. Until that's done, the injected script will 404/no-op in production (harmless, just no data collected).

Verified in the Expo web dev server (`npm run web`): app renders normally, no console errors, with `<Analytics />` mounted.

`@vercel/speed-insights` (Core Web Vitals) was explicitly out of scope for this pass — separate package, add only if requested.

**Anything another thread working today should know before touching related code:**
If `App.tsx`'s root `App()` function is restructured, keep `<Analytics />` as a sibling inside the same render tree (currently alongside `SafeAreaProvider`'s children) — it renders `null` and has no layout impact, so it doesn't need special placement, just needs to stay mounted once at the root, on web only.
