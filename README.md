# RecoveryAI - AI-Powered Movement Recovery Guidance

AI-powered app that provides personalized recovery guidance for movement-related discomfort using Claude AI.

## 🚀 Tech Stack

- **Frontend (Mobile)**: Expo (React Native + Web), TypeScript
- **Backend**: Next.js 14 API Routes, TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API (Sonnet 4.5, Haiku 4.5)
- **Payments**: Stripe
- **Auth**: Supabase Auth
- **Hosting**: Vercel (backend + web), EAS (mobile)

## 📁 Project Structure
```
recovery-ai-mvp/
├── apps/
│   ├── mobile/          # Expo app (iOS, Android, Web)
│   └── backend/         # Next.js API
├── supabase/            # Database migrations
├── shared/              # Shared TypeScript types
├── docs/                # Documentation & examples
└── scripts/             # Utility scripts
```

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key
- Stripe account (for payments)

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/recovery-ai-mvp.git
cd recovery-ai-mvp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables

Create .env files in both pps/backend and pps/mobile (see .env.example)

### 4. Database Setup
```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### 5. Start Development

Backend:
```bash
cd apps/backend
npm run dev
```

Mobile:
```bash
cd apps/mobile
npm start
```

## 📄 License

MIT License
