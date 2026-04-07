import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/db";

const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

function checkAuth(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  if (!key || key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// GET /api/admin/users — list all users with job counts
export async function GET(req: NextRequest) {
  const err = checkAuth(req);
  if (err) return err;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      brand: true,
      createdAt: true,
      _count: { select: { dubbingJobs: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      brand: u.brand,
      createdAt: u.createdAt,
      jobCount: u._count.dubbingJobs,
    })),
  });
}

// POST /api/admin/users — create a new user
export async function POST(req: NextRequest) {
  const err = checkAuth(req);
  if (err) return err;

  const { email, password, name, brand } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "email, password, name gerekli" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Bu email zaten kayıtlı" }, { status: 400 });
  }

  const hashed = await bcryptjs.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, brand: brand || null },
  });

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, brand: user.brand } });
}
