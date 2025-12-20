import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@repo/database";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { loginUser } from "@/src/services/auth/login.service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        try {
          return await loginUser(String(credentials.identifier), String(credentials.password));
        } catch {
          return null;
        }
      },
    }),
  ],
});
