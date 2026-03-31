# Superlike Video Dubbing Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where users upload Turkish voiceover videos, select a target language, and download the dubbed version via ElevenLabs Dubbing API.

**Architecture:** Next.js 15 App Router with Prisma/SQLite for persistence, NextAuth v5 for authentication, and ElevenLabs Dubbing API for video translation. Local disk storage for uploaded and dubbed files. Client-side polling for job status.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Prisma, SQLite, NextAuth v5, ElevenLabs API, bcrypt

---

## File Structure

```
superlike-dubbing/
├── prisma/
│   ├── schema.prisma              # User + DubbingJob models
│   └── seed.ts                    # Seed admin user
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (dark theme, fonts)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx     # Login form
│   │   │   └── register/page.tsx  # Register form
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard layout (sidebar + header)
│   │   │   ├── page.tsx           # Dashboard — job list table
│   │   │   ├── new/page.tsx       # New dubbing — upload + lang select
│   │   │   └── jobs/[id]/page.tsx # Job detail — progress + download
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │       ├── register/route.ts            # POST: create user
│   │       └── dubbing/
│   │           ├── route.ts                 # POST: create job, GET: list jobs
│   │           └── [id]/
│   │               ├── route.ts             # GET: job detail
│   │               ├── status/route.ts      # GET: poll ElevenLabs status
│   │               └── download/route.ts    # GET: serve dubbed file
│   ├── lib/
│   │   ├── auth.ts                # NextAuth config
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── elevenlabs.ts          # ElevenLabs API client
│   │   └── languages.ts           # Supported languages list
│   └── components/
│       ├── Sidebar.tsx            # Navigation sidebar
│       ├── StatusBadge.tsx        # Job status badge (colored)
│       ├── FileUpload.tsx         # Drag & drop file upload
│       └── LanguageSelect.tsx     # Language dropdown
├── uploads/                       # Uploaded original files (gitignored)
├── dubbed/                        # Dubbed output files (gitignored)
├── .env.local                     # Environment variables
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.local`, `.gitignore`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/alihan/Documents/github/superlike-dubbing
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. If the directory is not empty, say yes to overwrite.

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/alihan/Documents/github/superlike-dubbing
npm install prisma @prisma/client next-auth@5 bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 3: Create .env.local**

Create `/Users/alihan/Documents/github/superlike-dubbing/.env.local`:

```env
ELEVENLABS_API_KEY=your_api_key_here
NEXTAUTH_SECRET=superlike-dubbing-secret-change-me
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=file:./dev.db
```

- [ ] **Step 4: Update .gitignore**

Append to `.gitignore`:

```
uploads/
dubbed/
.env.local
```

- [ ] **Step 5: Create storage directories**

```bash
mkdir -p uploads dubbed
```

- [ ] **Step 6: Run dev server to verify**

```bash
npm run dev
```

Expected: Next.js dev server starts at http://localhost:3000 with default page.

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Database Schema & Prisma Setup

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`, `prisma/seed.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Write Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  createdAt DateTime @default(now())

  dubbingJobs DubbingJob[]
}

model DubbingJob {
  id               String    @id @default(cuid())
  userId           String
  originalFileName String
  originalFilePath String
  originalFileSize Int
  targetLang       String
  targetLangName   String
  status           String    @default("PENDING")
  dubbingId        String?
  expectedDuration Int?
  dubbedFilePath   String?
  errorMessage     String?
  createdAt        DateTime  @default(now())
  completedAt      DateTime?

  user User @relation(fields: [userId], references: [id])
}
```

Note: `status` is a String field with values: `PENDING`, `UPLOADING`, `PROCESSING`, `COMPLETED`, `FAILED`. SQLite doesn't support enums natively.

- [ ] **Step 3: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Create seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcryptjs.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@superlike.com" },
    update: {},
    create: {
      email: "admin@superlike.com",
      password: hashedPassword,
      name: "Admin",
    },
  });

  console.log("Seed completed: admin@superlike.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 5: Add seed script to package.json**

Add to `package.json`:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

- [ ] **Step 6: Run migration and seed**

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Expected: Database created at `prisma/dev.db`, seed user created.

- [ ] **Step 7: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: Browser opens, User table shows admin@superlike.com.

- [ ] **Step 8: Commit**

```bash
git add prisma/ src/lib/db.ts package.json
git commit -m "feat: add Prisma schema with User and DubbingJob models"
```

---

## Task 3: Authentication (NextAuth v5)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/register/route.ts`, `src/middleware.ts`

- [ ] **Step 1: Create NextAuth config**

Create `src/lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const isValid = await bcryptjs.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

- [ ] **Step 2: Create NextAuth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Create register API route**

Create `src/app/api/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Email, password ve isim gerekli" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Bu email zaten kayıtlı" },
      { status: 400 }
    );
  }

  const hashedPassword = await bcryptjs.hash(password, 10);

  await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Create middleware for route protection**

Create `src/middleware.ts`:

```typescript
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!api/auth|api/register|login|register|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Add NextAuth types**

Create `src/types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}
```

- [ ] **Step 6: Test auth by running dev server**

```bash
npm run dev
```

Navigate to http://localhost:3000 — should redirect to /login (which will 404 for now, that's expected).

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/app/api/register/ src/middleware.ts src/types/
git commit -m "feat: add NextAuth v5 authentication with credentials provider"
```

---

## Task 4: Login & Register Pages

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Create auth layout**

Create `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("Email veya şifre hatalı");
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">Superlike Dubbing</h1>
        <p className="text-gray-400 text-sm mb-6">Video çeviri aracına giriş yap</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-300 mb-1">
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="text-gray-500 text-sm mt-4 text-center">
          Hesabın yok mu?{" "}
          <Link href="/register" className="text-blue-400 hover:text-blue-300">
            Kayıt ol
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create register page**

Create `src/app/(auth)/register/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        name: formData.get("name"),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Kayıt başarısız");
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">Kayıt Ol</h1>
        <p className="text-gray-400 text-sm mb-6">Yeni hesap oluştur</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm text-gray-300 mb-1">
              Ad Soyad
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ad Soyad"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-300 mb-1">
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="text-gray-500 text-sm mt-4 text-center">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test login flow**

```bash
npm run dev
```

1. Go to http://localhost:3000/login
2. Login with admin@superlike.com / password123
3. Should redirect to / (will be empty dashboard for now)
4. Go to http://localhost:3000/register, create a new user, verify redirect to /login

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add login and register pages"
```

---

## Task 5: ElevenLabs API Client & Languages

**Files:**
- Create: `src/lib/elevenlabs.ts`, `src/lib/languages.ts`

- [ ] **Step 1: Create languages list**

Create `src/lib/languages.ts`:

```typescript
export interface Language {
  code: string;
  name: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "pl", name: "Polish" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "id", name: "Indonesian" },
  { code: "fil", name: "Filipino" },
  { code: "ja", name: "Japanese" },
  { code: "uk", name: "Ukrainian" },
  { code: "el", name: "Greek" },
  { code: "cs", name: "Czech" },
  { code: "fi", name: "Finnish" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "da", name: "Danish" },
  { code: "bg", name: "Bulgarian" },
  { code: "ms", name: "Malay" },
  { code: "sk", name: "Slovak" },
  { code: "hr", name: "Croatian" },
  { code: "ar", name: "Arabic" },
  { code: "ta", name: "Tamil" },
  { code: "zh", name: "Chinese" },
  { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" },
];
```

- [ ] **Step 2: Create ElevenLabs API client**

Create `src/lib/elevenlabs.ts`:

```typescript
const API_BASE = "https://api.elevenlabs.io/v1";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

export async function createDubbing(
  file: Buffer,
  fileName: string,
  targetLang: string
): Promise<{ dubbing_id: string; expected_duration_sec: number }> {
  const formData = new FormData();
  formData.append("file", new Blob([file]), fileName);
  formData.append("source_lang", "tr");
  formData.append("target_lang", targetLang);
  formData.append("num_speakers", "0");
  formData.append("watermark", "false");

  const res = await fetch(`${API_BASE}/dubbing`, {
    method: "POST",
    headers: { "xi-api-key": getApiKey() },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs dubbing failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function getDubbingStatus(dubbingId: string): Promise<{
  dubbing_id: string;
  name: string;
  status: string;
  target_languages: string[];
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/dubbing/${dubbingId}`, {
    headers: { "xi-api-key": getApiKey() },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs status check failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function getDubbedAudio(
  dubbingId: string,
  languageCode: string
): Promise<Buffer> {
  const res = await fetch(
    `${API_BASE}/dubbing/${dubbingId}/audio/${languageCode}`,
    {
      headers: { "xi-api-key": getApiKey() },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs download failed: ${res.status} ${error}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/elevenlabs.ts src/lib/languages.ts
git commit -m "feat: add ElevenLabs API client and supported languages"
```

---

## Task 6: Dubbing API Routes

**Files:**
- Create: `src/app/api/dubbing/route.ts`, `src/app/api/dubbing/[id]/route.ts`, `src/app/api/dubbing/[id]/status/route.ts`, `src/app/api/dubbing/[id]/download/route.ts`

- [ ] **Step 1: Create helper to get current user**

Create `src/lib/get-user.ts`:

```typescript
import { auth } from "./auth";

export async function getUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}
```

- [ ] **Step 2: Create POST /api/dubbing (create job) and GET /api/dubbing (list jobs)**

Create `src/app/api/dubbing/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { createDubbing } from "@/lib/elevenlabs";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "audio/mpeg", "audio/wav"];

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const targetLang = formData.get("targetLang") as string | null;

  if (!file || !targetLang) {
    return NextResponse.json(
      { error: "Dosya ve hedef dil gerekli" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Dosya boyutu 500MB'ı aşamaz" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Sadece MP4, MOV, MP3, WAV dosyaları kabul edilir" },
      { status: 400 }
    );
  }

  const language = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
  if (!language) {
    return NextResponse.json({ error: "Geçersiz dil seçimi" }, { status: 400 });
  }

  // Save file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  const uniqueName = `${Date.now()}-${file.name}`;
  const filePath = path.join(process.cwd(), "uploads", uniqueName);
  await writeFile(filePath, buffer);

  // Create job in DB
  const job = await prisma.dubbingJob.create({
    data: {
      userId: user.id,
      originalFileName: file.name,
      originalFilePath: filePath,
      originalFileSize: file.size,
      targetLang: language.code,
      targetLangName: language.name,
      status: "UPLOADING",
    },
  });

  // Send to ElevenLabs
  try {
    const result = await createDubbing(buffer, file.name, targetLang);

    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: {
        dubbingId: result.dubbing_id,
        expectedDuration: Math.ceil(result.expected_duration_sec),
        status: "PROCESSING",
      },
    });
  } catch (error) {
    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Bilinmeyen hata",
      },
    });
  }

  return NextResponse.json({ id: job.id });
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.dubbingJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalFileName: true,
      targetLang: true,
      targetLangName: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json(jobs);
}
```

- [ ] **Step 3: Create GET /api/dubbing/[id] (job detail)**

Create `src/app/api/dubbing/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prisma.dubbingJob.findFirst({
    where: { id, userId: user.id },
  });

  if (!job) {
    return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(job);
}
```

- [ ] **Step 4: Create GET /api/dubbing/[id]/status (poll ElevenLabs)**

Create `src/app/api/dubbing/[id]/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { getDubbingStatus, getDubbedAudio } from "@/lib/elevenlabs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prisma.dubbingJob.findFirst({
    where: { id, userId: user.id },
  });

  if (!job) {
    return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
  }

  if (!job.dubbingId || job.status === "COMPLETED" || job.status === "FAILED") {
    return NextResponse.json({ status: job.status });
  }

  try {
    const result = await getDubbingStatus(job.dubbingId);

    if (result.status === "dubbed") {
      // Download the dubbed file
      const audioBuffer = await getDubbedAudio(job.dubbingId, job.targetLang);
      const dubbedFileName = `${job.dubbingId}-${job.targetLang}.mp4`;
      const dubbedPath = path.join(process.cwd(), "dubbed", dubbedFileName);
      await writeFile(dubbedPath, audioBuffer);

      await prisma.dubbingJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          dubbedFilePath: dubbedPath,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ status: "COMPLETED" });
    }

    if (result.error) {
      await prisma.dubbingJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: result.error,
        },
      });

      return NextResponse.json({ status: "FAILED", error: result.error });
    }

    return NextResponse.json({ status: "PROCESSING" });
  } catch (error) {
    return NextResponse.json({
      status: "PROCESSING",
      error: error instanceof Error ? error.message : "Status check failed",
    });
  }
}
```

- [ ] **Step 5: Create GET /api/dubbing/[id]/download (serve file)**

Create `src/app/api/dubbing/[id]/download/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prisma.dubbingJob.findFirst({
    where: { id, userId: user.id, status: "COMPLETED" },
  });

  if (!job || !job.dubbedFilePath) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  const fileBuffer = await readFile(job.dubbedFilePath);
  const fileName = `${job.originalFileName.replace(/\.[^.]+$/, "")}-${job.targetLangName}.mp4`;

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/dubbing/ src/lib/get-user.ts
git commit -m "feat: add dubbing API routes (create, list, status, download)"
```

---

## Task 7: Shared UI Components

**Files:**
- Create: `src/components/Sidebar.tsx`, `src/components/StatusBadge.tsx`, `src/components/FileUpload.tsx`, `src/components/LanguageSelect.tsx`

- [ ] **Step 1: Create StatusBadge component**

Create `src/components/StatusBadge.tsx`:

```tsx
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Bekliyor", className: "bg-gray-700 text-gray-300" },
  UPLOADING: { label: "Yükleniyor", className: "bg-yellow-900 text-yellow-300" },
  PROCESSING: { label: "İşleniyor", className: "bg-blue-900 text-blue-300" },
  COMPLETED: { label: "Tamamlandı", className: "bg-green-900 text-green-300" },
  FAILED: { label: "Başarısız", className: "bg-red-900 text-red-300" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || STATUS_MAP.PENDING;
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
```

- [ ] **Step 2: Create Sidebar component**

Create `src/components/Sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📋" },
  { href: "/new", label: "Yeni Çeviri", icon: "🎬" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Superlike</h1>
        <p className="text-xs text-gray-500">Video Dubbing</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create FileUpload component**

Create `src/components/FileUpload.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".mp3", ".wav"];
const MAX_SIZE = 500 * 1024 * 1024;

export function FileUpload({ onFileSelect, selectedFile }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  const validateFile = useCallback((file: File): boolean => {
    setError("");
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError("Sadece MP4, MOV, MP3, WAV dosyaları kabul edilir");
      return false;
    }
    if (file.size > MAX_SIZE) {
      setError("Dosya boyutu 500MB'ı aşamaz");
      return false;
    }
    return true;
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) onFileSelect(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) onFileSelect(file);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? "border-blue-500 bg-blue-500/10"
            : selectedFile
            ? "border-green-600 bg-green-900/20"
            : "border-gray-700 hover:border-gray-600"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".mp4,.mov,.mp3,.wav"
          onChange={handleChange}
          className="hidden"
        />

        {selectedFile ? (
          <div>
            <p className="text-green-400 font-medium">{selectedFile.name}</p>
            <p className="text-gray-500 text-sm mt-1">{formatSize(selectedFile.size)}</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-300">Dosyayı sürükle veya tıkla</p>
            <p className="text-gray-500 text-sm mt-1">MP4, MOV, MP3, WAV — Max 500MB</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Create LanguageSelect component**

Create `src/components/LanguageSelect.tsx`:

```tsx
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

interface LanguageSelectProps {
  value: string;
  onChange: (code: string) => void;
}

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">Hedef dil seçin</option>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: add shared UI components (Sidebar, StatusBadge, FileUpload, LanguageSelect)"
```

---

## Task 8: Dashboard Page

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root layout for dark theme**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Superlike Dubbing",
  description: "Video dubbing tool powered by ElevenLabs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create dashboard layout**

Create `src/app/(dashboard)/layout.tsx`:

```tsx
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard page**

Create `src/app/(dashboard)/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface Job {
  id: string;
  originalFileName: string;
  targetLang: string;
  targetLangName: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dubbing")
      .then((res) => res.json())
      .then((data) => {
        setJobs(data);
        setLoading(false);
      });
  }, []);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Video çevirileriniz</p>
        </div>
        <Link
          href="/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Yeni Çeviri
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-500">Yükleniyor...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-400">Henüz çeviri yok</p>
          <Link
            href="/new"
            className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
          >
            İlk çeviriyi başlat
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Dosya</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Hedef Dil</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Durum</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Tarih</th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm">{job.originalFileName}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{job.targetLangName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(job.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Test dashboard**

```bash
npm run dev
```

Login → should see empty dashboard with "Yeni Çeviri" button.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/\(dashboard\)/
git commit -m "feat: add dashboard page with job list table"
```

---

## Task 9: New Dubbing Page

**Files:**
- Create: `src/app/(dashboard)/new/page.tsx`

- [ ] **Step 1: Create new dubbing page**

Create `src/app/(dashboard)/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { LanguageSelect } from "@/components/LanguageSelect";

export default function NewDubbingPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file || !targetLang) {
      setError("Dosya ve hedef dil seçimi gerekli");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetLang", targetLang);

    try {
      const res = await fetch("/api/dubbing", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Çeviri başlatılamadı");
        setLoading(false);
        return;
      }

      router.push(`/jobs/${data.id}`);
    } catch {
      setError("Bağlantı hatası, lütfen tekrar deneyin");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-1">Yeni Çeviri</h1>
      <p className="text-gray-400 text-sm mb-8">Video yükle ve hedef dil seç</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Video / Ses Dosyası</label>
          <FileUpload onFileSelect={setFile} selectedFile={file} />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-2">Hedef Dil</label>
          <LanguageSelect value={targetLang} onChange={setTargetLang} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500">
            Kaynak dil: <span className="text-gray-300">Türkçe</span> (sabit)
          </p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !file || !targetLang}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Yükleniyor ve çeviri başlatılıyor..." : "Çeviriyi Başlat"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Test new dubbing page**

```bash
npm run dev
```

Navigate to /new — should see file upload area and language dropdown.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/new/
git commit -m "feat: add new dubbing page with file upload and language selection"
```

---

## Task 10: Job Detail Page (Progress + Download)

**Files:**
- Create: `src/app/(dashboard)/jobs/[id]/page.tsx`

- [ ] **Step 1: Create job detail page**

Create `src/app/(dashboard)/jobs/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface JobDetail {
  id: string;
  originalFileName: string;
  originalFileSize: number;
  targetLang: string;
  targetLangName: string;
  status: string;
  expectedDuration: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    const res = await fetch(`/api/dubbing/${id}`);
    if (res.ok) {
      const data = await res.json();
      setJob(data);
      setLoading(false);
    }
  }, [id]);

  // Poll status while processing
  useEffect(() => {
    fetchJob();

    const interval = setInterval(async () => {
      if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;

      const res = await fetch(`/api/dubbing/${id}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status !== job?.status) {
          fetchJob(); // Refresh full job data
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, job?.status, fetchJob]);

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return <div className="text-gray-500">Yükleniyor...</div>;
  }

  if (!job) {
    return <div className="text-red-400">Job bulunamadı</div>;
  }

  return (
    <div className="max-w-xl">
      <Link href="/" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
        &larr; Dashboard
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{job.originalFileName}</h1>
            <p className="text-gray-500 text-sm mt-1">{formatSize(job.originalFileSize)}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Kaynak Dil</p>
            <p className="text-gray-200">Türkçe</p>
          </div>
          <div>
            <p className="text-gray-500">Hedef Dil</p>
            <p className="text-gray-200">{job.targetLangName}</p>
          </div>
          <div>
            <p className="text-gray-500">Oluşturulma</p>
            <p className="text-gray-200">{formatDate(job.createdAt)}</p>
          </div>
          {job.completedAt && (
            <div>
              <p className="text-gray-500">Tamamlanma</p>
              <p className="text-gray-200">{formatDate(job.completedAt)}</p>
            </div>
          )}
        </div>

        {job.status === "PROCESSING" && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-blue-300 text-sm font-medium">Çeviri işleniyor...</p>
                {job.expectedDuration && (
                  <p className="text-blue-400/60 text-xs mt-0.5">
                    Tahmini süre: ~{Math.ceil(job.expectedDuration / 60)} dakika
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {job.status === "FAILED" && job.errorMessage && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-300 text-sm">{job.errorMessage}</p>
          </div>
        )}

        {job.status === "COMPLETED" && (
          <a
            href={`/api/dubbing/${job.id}/download`}
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-center"
          >
            Çevrilmiş Videoyu İndir
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test job detail page**

```bash
npm run dev
```

Navigate to /jobs/fake-id — should show "Job bulunamadı".

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/jobs/
git commit -m "feat: add job detail page with polling and download"
```

---

## Task 11: Next.js Config for Large File Uploads

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update Next.js config**

Replace `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
```

Note: Next.js API routes use the `bodyParser` config. For App Router, we also need to set the route segment config in the dubbing route.

- [ ] **Step 2: Add route segment config to dubbing POST route**

Add this to the top of `src/app/api/dubbing/route.ts` (before imports):

```typescript
export const maxDuration = 300; // 5 minutes for large uploads
```

- [ ] **Step 3: Commit**

```bash
git add next.config.ts src/app/api/dubbing/route.ts
git commit -m "feat: configure large file upload limits (500MB)"
```

---

## Task 12: End-to-End Test

- [ ] **Step 1: Set real ElevenLabs API key**

Edit `.env.local` and set `ELEVENLABS_API_KEY` to a real API key.

- [ ] **Step 2: Full flow test**

```bash
npm run dev
```

1. Go to http://localhost:3000/login
2. Login with admin@superlike.com / password123
3. Click "Yeni Çeviri"
4. Upload a short Turkish video (< 1 minute for testing)
5. Select "English" as target language
6. Click "Çeviriyi Başlat"
7. Wait on job detail page — spinner should show, then turn to "Tamamlandı"
8. Click "Çevrilmiş Videoyu İndir"
9. Verify the downloaded video has English audio
10. Go back to Dashboard — job should be listed in the table

- [ ] **Step 3: Test register flow**

1. Go to /register
2. Create a new user
3. Login with new user
4. Verify empty dashboard

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: superlike dubbing tool MVP complete"
```
