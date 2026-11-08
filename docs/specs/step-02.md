# Step-02 scaffold

The repo becomes a Next.js 16 App Router app with strict TypeScript, Tailwind 4, `cacheComponents`, ESLint, and shadcn/ui on a neutral base.
`lib/db.ts` exposes a Drizzle client on the Neon serverless driver. Tunables live in `lib/config.ts`. `lib/format.ts` formats GBP prices from integer pence, dates, and relative times.
`.env.example` lists the six required keys. Package scripts cover dev, build, lint, typecheck, test, e2e, Drizzle, and import. Empty folders from `AGENTS.md` keep a `.gitkeep`.
It works when `/` shows a centred card reading "Barrow" and "Build in progress", and `npm run typecheck` and `npm run build` both pass.
