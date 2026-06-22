# AbsoraCode

> A LeetCode-style platform for **absolute beginners**. Pick a language, solve MCQ + code problems, track per-language mastery on a dashboard.

## Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Framework   | Next.js 15 (App Router), TypeScript           |
| Styling     | Tailwind CSS                                  |
| Database    | Cloudflare D1 (SQLite, accessed via REST API) |
| Editor      | Monaco Editor                                 |
| AI          | Gemini 2.0 Flash (server-side only)           |
| Auth        | JWT in httpOnly cookies, bcrypt passwords     |
| Hosting     | Vercel (frontend + serverless API routes)     |

---

## Quick Start (Local Dev)

### 1. Clone & install

```bash
git clone https://github.com/AADI-playz23/absoracode.git
cd absoracode
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
# Fill in your values (see below)
```

Required variables:

```
CF_ACCOUNT_ID=          # Cloudflare account ID
CF_D1_DATABASE_ID=      # D1 database ID
CF_API_TOKEN=           # Cloudflare API token (D1 edit permissions)
GEMINI_API_KEY=         # Google AI Studio API key
JWT_SECRET=             # Any long random string (32+ chars)
```

### 3. Set up Cloudflare D1

**Create the database** (if not already done):
```bash
npx wrangler d1 create absoracode-db
```

**Apply schema:**
```bash
npx wrangler d1 execute absoracode-db --file=db/schema.sql
```

**Seed built-in languages and problems:**
```bash
npx wrangler d1 execute absoracode-db --file=db/seed.sql
```

Or via the Cloudflare Dashboard:
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → D1
2. Select your database → Console
3. Paste and run the contents of `db/schema.sql`, then `db/seed.sql`

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Import into [vercel.com](https://vercel.com)
3. Add these environment variables in Vercel Project Settings:

| Variable              | Value                        |
|-----------------------|------------------------------|
| `CF_ACCOUNT_ID`       | Your Cloudflare Account ID   |
| `CF_D1_DATABASE_ID`   | Your D1 Database ID          |
| `CF_API_TOKEN`        | Your Cloudflare API Token    |
| `GEMINI_API_KEY`      | Your Gemini API Key          |
| `JWT_SECRET`          | A random secret string       |

4. Deploy!

---

## Project Structure

```
absoracode/
├── app/
│   ├── layout.tsx                 # Root layout with Navbar
│   ├── page.tsx                   # Landing page
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx         # Mastery dashboard
│   ├── languages/
│   │   ├── page.tsx               # Built-in + custom language picker
│   │   └── custom/page.tsx        # Custom language generator
│   ├── problem/[languageId]/
│   │   └── page.tsx               # Problem solving page
│   └── api/
│       ├── auth/{login,signup,logout}/route.ts
│       ├── languages/route.ts
│       ├── problem-next/route.ts
│       ├── submit/route.ts
│       ├── generate-batch/route.ts
│       └── progress/route.ts
├── components/
│   ├── editor/{CodeEditor,LivePreview}.tsx
│   ├── dashboard/{MasteryCard,ProgressChart}.tsx
│   ├── problem/{ProblemHeader,McqOptions,NextButton}.tsx
│   └── ui/{Button,Card,Input,Navbar}.tsx
├── lib/
│   ├── d1.ts      # Cloudflare D1 REST client
│   ├── types.ts   # TypeScript interfaces
│   ├── auth.ts    # JWT + bcrypt helpers
│   ├── mastery.ts # Score calculation
│   └── gemini.ts  # Gemini API integration
└── db/
    ├── schema.sql
    └── seed.sql
```

---

## How Grading Works

| Problem Type        | Language       | Method                          |
|---------------------|----------------|---------------------------------|
| MCQ                 | Any            | Exact string match              |
| Code                | JavaScript     | `new Function` sandbox + test cases |
| Code                | HTML/CSS       | String `contains:` check        |
| Code                | Python         | Gemini AI evaluation            |
| Code                | Custom language | Gemini AI evaluation            |

> **Note:** No arbitrary code execution infra. Python and custom languages are AI-graded.

---

## DevBox

An external coding sandbox is available at:  
**[Open DevBox →](https://absoradevbox.vercel.app/devbox_login.html)**

It opens in a new tab from the problem page header. There is no shared auth or API bridge between AbsoraCode and DevBox.

---

## License

MIT
