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
