import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

function checkAuth(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  if (!key || key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

type Props = { params: Promise<{ id: string }> };

// GET /api/admin/users/[id] — user detail + jobs
export async function GET(req: NextRequest, { params }: Props) {
  const err = checkAuth(req);
  if (err) return err;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      brand: true,
      createdAt: true,
      dubbingJobs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          originalFileName: true,
          originalFileSize: true,
          sourceLangName: true,
          targetLangName: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user });
}

// PATCH /api/admin/users/[id] — update user fields
export async function PATCH(req: NextRequest, { params }: Props) {
  const err = checkAuth(req);
  if (err) return err;

  const { id } = await params;
  const body = await req.json();

  const allowed = ["name", "email", "brand"];
  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  if (body.password && body.password.length >= 8) {
    const bcryptjs = (await import("bcryptjs")).default;
    data.password = await bcryptjs.hash(body.password, 10);
  }

  const user = await prisma.user.update({ where: { id }, data });

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, brand: user.brand } });
}

// DELETE /api/admin/users/[id] — delete user and their jobs
export async function DELETE(req: NextRequest, { params }: Props) {
  const err = checkAuth(req);
  if (err) return err;

  const { id } = await params;

  await prisma.dubbingJob.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
