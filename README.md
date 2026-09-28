# ShadowCoach (ApexCombat.AI)

A browser-based AI combat-sports/fitness coach. Your webcam feed runs through
real-time pose detection to track jabs, squats, and slip-defense reps with
spoken coaching feedback, and an LLM (via Groq) generates custom home workout
routines on demand.

This is a **Next.js migration** of the original Vite + Express version. See
[What changed](#what-changed-from-the-original-version) below for the full
list of fixes.

## Stack

- Next.js 15 (App Router), React 19, Tailwind CSS v4, Zustand
- `@mediapipe/tasks-vision` (PoseLandmarker) running in a Web Worker
- Groq SDK, called from a Next.js API route (`app/api/workout/generate`)

## Getting started

```bash
npm install
cp .env.example .env.local
# edit .env.local and set GROQ_API_KEY (get one at https://console.groq.com/keys)
npm run dev
```

Open http://localhost:3000. Grant camera access when prompted.

**Note:** camera access (`getUserMedia`) only works over HTTPS or on
`localhost`. If you deploy this, make sure it's served over HTTPS (Vercel,
Netlify, etc. do this automatically).

## Environment variables

See `.env.example`. In short:

- `GROQ_API_KEY` — required, or `/api/workout/generate` returns a clear 500
  instead of a mystery crash.
- `GROQ_MODEL` — optional, defaults to `openai/gpt-oss-120b`. Groq
  decommissions models with only a few months' notice (this project was
  broken by exactly that, twice — see below), so check
  https://console.groq.com/docs/models before deploying and update this if
  needed.
- `WORKOUT_RATE_LIMIT_PER_MINUTE` — optional, defaults to 10.

## Deploying

Because the workout-generation API now lives inside the Next.js app (instead
of a separate Express server), you only have **one thing to deploy**, not
two:

1. Push to a Git repo and import it into Vercel (or any Next.js-compatible
   host).
2. Set `GROQ_API_KEY` (and optionally `GROQ_MODEL`) as environment variables
   in the hosting dashboard.
3. Deploy. There's no CORS configuration to manage and no second service to
   stand up — the API and frontend are same-origin by construction.

If you deploy somewhere that runs multiple server instances/regions
concurrently, note the rate limiter in `lib/rateLimit.js` is in-memory and
per-instance (see the comment in that file) — fine for a demo, but swap it
for Upstash Redis/Vercel KV if you need a real shared limit.

## What changed from the original version

The original Vite + Express version had a few issues that would have broken
it in production. All are fixed here:

1. **Dead LLM model.** The original called Groq with `llama3-70b-8192`,
   decommissioned by Groq in August 2025. Its recommended replacement,
   `llama-3.3-70b-versatile`, was *also* decommissioned on August 16, 2026.
   The model is now `openai/gpt-oss-120b` by default and configurable via
   `GROQ_MODEL` so the next deprecation is a config change, not a redeploy.

2. **Pose tracking likely never worked.** The original ran the legacy
   `@mediapipe/pose` package inside a Web Worker. That package touches
   `document` internally, which doesn't exist in a Worker — it would throw
   `ReferenceError: document is not defined` on init and the whole tracking
   feature would silently fail. Pose detection now uses
   `@mediapipe/tasks-vision` (`PoseLandmarker`), Google's supported
   successor, which is explicitly built to run in a Worker.

3. **Hardcoded `localhost` URLs.** The frontend called
   `http://localhost:5000` directly, and the Express server only allowed
   CORS from `http://localhost:5173` — both would break immediately on any
   real deployment. Moving the API into Next.js as `/api/workout/generate`
   makes this a non-issue: frontend and backend are always same-origin, so
   there's no URL or CORS config to get wrong.

4. **No env var validation.** Missing `GROQ_API_KEY` now returns a clear
   500 with a message telling you what's missing, instead of an opaque SDK
   crash on first request.

5. **Silent failures.** Camera-permission denial and workout-generation
   failures now surface a visible error message in the UI instead of only
   logging to the console.

6. **Skeleton/video mirror mismatch.** The video is mirrored via CSS
   (`scale-x-[-1]`) for a natural selfie view, but the original also
   manually flipped landmark x-coordinates before drawing — the two flips
   canceled out, so the skeleton overlay likely didn't line up with the
   mirrored video. Landmarks are now drawn in raw coordinates and mirrored
   only once, by the shared CSS transform on the video+canvas container.

7. **No security headers / rate limiting.** Added baseline security headers
   in `next.config.mjs` (Next's equivalent of Express's `helmet`) and a
   simple per-IP rate limit on the workout-generation endpoint (see
   `lib/rateLimit.js` for its limitations).

8. **No health check.** Added `GET /api/health`.

## Known limitations / things worth testing before you rely on this

- The rate limiter is in-memory and per-instance (see above) — good enough
  for a single deployment, not for a distributed one.
- Pose detection quality depends on lighting and framing; the "step back
  fully" guidance in the UI reflects the app's real accuracy requirements,
  not just a UI nicety.
- This hasn't been run against a live browser in this environment (no
  network access here to install dependencies) — the MediaPipe migration in
  particular is worth a manual smoke test on your machine before you ship
  it, since it's the single biggest change.
