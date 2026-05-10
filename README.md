# miso healthy

AI-powered recipe transformation. Type any dish, get a baseline original recipe + a Recipe-For-Health version with side-by-side nutrition.

Built for [misohealthy.app](https://misohealthy.app).

## Stack

- Next.js 16 (App Router)
- React 19
- Anthropic Claude (Sonnet 4.6) for recipe generation
- Vercel for hosting

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in ANTHROPIC_API_KEY
npm run dev
```

## Architecture

- `app/page.tsx` — landing page
- `app/components/Converter.tsx` — hero converter (client component)
- `app/components/Waitlist.tsx` — email signup (client component)
- `app/api/convert/route.ts` — POST { dish, vegetarian } → original + healthy + nutrition + swaps
- `app/api/waitlist/route.ts` — POST { email } → logs to console (TODO: persist)
- `lib/system-prompt.ts` — the Recipe-For-Health voice and curated swap rules. Edit this to evolve the AI's behavior.

## Editing the swap rules

The AI's behavior comes from `lib/system-prompt.ts`. Add or refine swaps there — Dr. Stoler's voice and the RFH ruleset live in that file as a structured Markdown spec passed to Claude on every request.
