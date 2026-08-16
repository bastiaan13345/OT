import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  const email = required("PROVISION_EMAIL").toLowerCase();
  const name = required("PROVISION_NAME");
  const password = required("PROVISION_PASSWORD");
  const role = required("PROVISION_ROLE").toUpperCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("PROVISION_EMAIL must be a valid email address.");
  }
  if (!new Set(["LISTENER", "CREATOR", "ADMIN"]).has(role)) {
    throw new Error("PROVISION_ROLE must be LISTENER, CREATOR, or ADMIN.");
  }
  if (name.length > 100) throw new Error("PROVISION_NAME is too long.");
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("PROVISION_PASSWORD must be between 12 characters and 72 bytes.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (existingAdmin && role !== "ADMIN") {
    throw new Error("An administrator with this email cannot be demoted by this command.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { email },
      update: {
        name,
        password: passwordHash,
        role,
        approved: true,
        sessionVersion: { increment: 1 },
      },
      create: { name, email, password: passwordHash, role, approved: true },
    });

    if (role === "ADMIN") {
      await tx.admin.upsert({
        where: { email },
        update: { password: passwordHash, sessionVersion: { increment: 1 } },
        create: { email, password: passwordHash },
      });
    }
  });

  console.log(JSON.stringify({ event: "user.provisioned", email, role }));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      event: "user.provision_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
