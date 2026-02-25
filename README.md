# ColdReach - AI Cold Email Personalization SaaS

AI-powered cold email personalization tool for better outreach at scale.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Auth:** NextAuth.js v4
- **Database:** Turso (libSQL)

## Project Structure

```
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx       # Sign in page
│   │   └── register/page.tsx    # Registration page
│   ├── api/
│   │   └── auth/[...nextauth]/  # NextAuth.js API routes
│   ├── dashboard/
│   │   └── page.tsx             # Main dashboard (protected)
│   ├── layout.tsx               # Root layout with providers
│   ├── globals.css              # Tailwind + shadcn styles
│   └── page.tsx                 # Landing page
├── components/
│   ├── ui/                      # shadcn components
│   ├── navbar.tsx               # Navigation bar
│   └── providers.tsx            # Context providers
├── lib/
│   ├── auth.ts                  # NextAuth configuration
│   ├── db.ts                    # Turso client setup
│   └── utils.ts                 # Utility functions
├── types/
│   └── index.ts                 # TypeScript type definitions
└── .env.local.example           # Environment variables template
```

## Quick Start

### 1. Environment Setup

Copy the environment template and fill in your credentials:

```bash
cp .env.local.example .env.local
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

### 3. Turso Database Setup

1. Install Turso CLI: `brew install tursodatabase/tap/turso`
2. Login: `turso auth login`
3. Create database: `turso db create coldreach`
4. Get connection details: `turso db show coldreach`
5. Create auth token: `turso db tokens create coldreach`
6. Update `.env.local` with the URL and token

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features Implemented (Part 1)

- ✅ Next.js 14+ with TypeScript and Tailwind CSS
- ✅ shadcn/ui components (Button, Card, Input, Label)
- ✅ Folder structure with route groups
- ✅ NextAuth.js with Google OAuth provider
- ✅ Turso database client configuration
- ✅ Responsive navigation bar
- ✅ Landing page with feature highlights
- ✅ Login and registration pages
- ✅ Protected dashboard page
- ✅ Type definitions for core entities

## Next Steps (Part 2)

1. **Database Schema:** Create tables for users, campaigns, prospects, templates
2. **API Routes:** Build REST endpoints for campaign CRUD operations
3. **AI Integration:** Connect to OpenAI/Anthropic for email personalization
4. **Email Sending:** Integrate with SendGrid/AWS SES
5. **Campaign Builder:** UI for creating and managing campaigns
6. **Prospect Management:** CSV upload, prospect list management
7. **Analytics Dashboard:** Email tracking and response metrics

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | App URL (http://localhost:3000) |
| `NEXTAUTH_SECRET` | Random secret for JWT encryption |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `TURSO_DATABASE_URL` | Turso database connection URL |
| `TURSO_AUTH_TOKEN` | Turso database auth token |

## License

Private - Mason's side hustle project
