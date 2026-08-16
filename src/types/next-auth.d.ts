import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      authInvalidated?: boolean;
    };
  }

  interface User {
    id: string;
    role?: string;
    accountType?: "user" | "admin";
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accountType?: "user" | "admin";
    sessionVersion?: number;
    authInvalidated?: boolean;
  }
}
