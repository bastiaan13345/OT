import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { refreshVersionedToken } from "@/lib/auth/session-version";

export const APPROVAL_ADMIN_EMAIL = "fagatronous@gmail.com";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Normalize email the same way registerCreator stores it
        // (trim + lowercase) so a mixed-case login still matches the account.
        const email = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (!isValid) return null;

          if (!user.approved) {
            throw new Error("PENDING_APPROVAL");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            accountType: "user",
            sessionVersion: user.sessionVersion,
          };
        }

        const admin = await prisma.admin.findUnique({
          where: { email },
        });

        if (!admin) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          admin.password
        );
        if (!isValid) return null;

        return {
          id: admin.id,
          email: admin.email,
          role: "ADMIN",
          accountType: "admin",
          sessionVersion: admin.sessionVersion,
        };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "LISTENER";
        token.accountType = user.accountType;
        token.sessionVersion = user.sessionVersion;
        token.authInvalidated = false;
      }
      return refreshVersionedToken(token, {
        findUser: (id) => prisma.user.findUnique({
          where: { id },
          select: { role: true, sessionVersion: true },
        }),
        findAdmin: (id) => prisma.admin.findUnique({
          where: { id },
          select: { sessionVersion: true },
        }),
      });
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.authInvalidated = token.authInvalidated === true;
      }
      return session;
    },
  },
};
