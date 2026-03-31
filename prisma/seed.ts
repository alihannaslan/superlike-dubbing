import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcryptjs from "bcryptjs";
import path from "path";

const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const dbPath = dbUrl.replace(/^file:/, "");
const resolvedPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath);

const adapter = new PrismaBetterSqlite3({ url: resolvedPath });
const prisma = new PrismaClient({ adapter });

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
