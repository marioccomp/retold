import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@repo/database";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { authConfig } from "./auth.config";
import { userRepository } from "@repo/database";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // cada sessao dura 7 dias, a cada nova requisicao ele atualiza o token
  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
        authorization: {
          params: {
            scope: "read:user user:email read:org",
          },
        },
      }),
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Identifier", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const identifier = credentials.identifier as string;
        const password = credentials.password as string;

        if (!identifier || !password) return null;

        const user = await userRepository.findByEmailOrUsername(identifier, identifier);

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
          image: user.image,
          username: user.username,
          hasPassword: true,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
