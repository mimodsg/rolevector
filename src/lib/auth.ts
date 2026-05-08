import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "./env";
import { prisma } from "./prisma";
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure
} from "./server/login-attempts";

const DUMMY_PASSWORD_HASH =
  "$2a$12$dUtnR9wLQLR57qoaS1IsVO6WCAy5MabCkqZjYw6YujyLoz0QYzOaW";

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password || password.length > 128) {
          return null;
        }

        if (isLoginLocked(email)) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          recordLoginFailure(email);
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          recordLoginFailure(email);
          return null;
        }

        clearLoginFailures(email);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role ?? "Authenticated";
      }

      return session;
    }
  }
};
