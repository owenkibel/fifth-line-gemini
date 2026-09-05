# Fifth Line (Gemini Edition)

A structured anapestic limerick engine with prosody telemetry, local archival, and generative media prompt staging (T2I, I2V, T2V), powered by Google Gemini.

Developed by Owen Kibel in conversation with  Gemini 3.8 Flash Extended thinking.

Based on the Grok powered https://github.com/owenkibel/fifth-line

---

## Features

- **Strict Prosody & Meter Enforcement:** Uses Gemini 2.0/3.x structured JSON schema (`responseSchema`) to calculate line-by-line syllable counts and enforce classical AABBA rhyme tokens.
- **After Hours Mode:** Optional relaxed-threshold mode calibrated for traditional British tavern wit, ribald humor, and double-entendres.
- **Two-Step Media Staging:** On-demand generation of three tailored generative visual directives without diluting the verse generator's meter focus:
  - **Keyframe Prompt (T2I):** Compositional still image prompt for models like Flux or Midjourney.
  - **Motion Directive (I2V):** Temporal physics and camera motion prompt to animate the keyframe in LTX-Video, Wan, or Kling.
  - **Art-Directed Verse (T2V):** Stylistic wrapper around the poem for direct text-to-video models.
- **Local-First Archival & Export:**
  - Fast single-click clean text copying (title + 5 lines only).
  - Browser persistence via `localStorage` with insecure/secure context fallback.
  - Single `.md` export with static-site generator front matter (tags, model, meter compliance, syllable arrays).
  - Batch `.zip` export of the most recent slice of 40 limericks.
- **Zero-Leak Secret Architecture:** The `GEMINI_API_KEY` executes exclusively inside Next.js serverless route handlers and is never exposed to the client browser.

---

## Tech Stack

- **Framework:** Next.js (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **AI SDK:** `@google/genai` (Gemini 3.8 Flash)
- **Compression:** `jszip`

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- A Google AI Studio API key ([aistudio.google.com](https://aistudio.google.com/))

### 1. Clone the Repository

```bash
git clone [https://github.com/owenkibel/fifth-line-gemini.git](https://github.com/owenkibel/fifth-line-gemini.git)
cd fifth-line-gemini

2. Install Dependencies
Bash
npm install
# or
bun install
3. Configure Environment
Create a .env.local file in the root directory:

Bash
GEMINI_API_KEY=your_gemini_api_key_here
4. Run Locally
Bash
npm run dev
# or
bun dev
Open http://localhost:3000 in your browser.

Deployment to Vercel
Push your repository to GitHub (ensure .env.local is listed in .gitignore).

Import the project in Vercel.

Under Environment Variables, add:

Key: GEMINI_API_KEY

Value: Your Google AI Studio API key.

Click Deploy. Vercel will bundle the /api/limerick and /api/visualize routes as serverless functions.

```

License
MIT © 2026 Owen Kibel

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
