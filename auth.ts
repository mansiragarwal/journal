import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        isSignUp: { label: "Sign Up", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        const name = credentials?.name as string;
        const isSignUp = credentials?.isSignUp === "true";

        if (!email || !password) return null;

        const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;

        if (isSignUp) {
          if (rows.length > 0) return null;
          const hash = await bcrypt.hash(password, 12);
          const { rows: newRows } = await sql`
            INSERT INTO users (name, email, password_hash)
            VALUES (${name || email.split("@")[0]}, ${email}, ${hash})
            RETURNING *
          `;
          const user = newRows[0];
          return { id: user.id, name: user.name, email: user.email, image: user.image };
        }

        const user = rows[0];
        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  debug: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        try {
          const { rows } = await sql`SELECT id, onboarding_complete FROM users WHERE email = ${user.email}`;
          if (rows.length === 0) {
            const { rows: newRows } = await sql`
              INSERT INTO users (name, email, image, email_verified)
              VALUES (${user.name ?? null}, ${user.email}, ${user.image ?? null}, NOW())
              RETURNING id, onboarding_complete
            `;
            token.id = newRows[0].id;
            token.onboardingComplete = false;
          } else {
            token.id = rows[0].id;
            token.onboardingComplete = rows[0].onboarding_complete;
          }
        } catch (err) {
          console.error("Google sign-in DB error:", err);
          throw err;
        }
      } else if (user) {
        token.id = user.id;
        try {
          const { rows } = await sql`SELECT onboarding_complete FROM users WHERE id = ${user.id}`;
          token.onboardingComplete = rows[0]?.onboarding_complete ?? false;
        } catch {
          token.onboardingComplete = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        (session as unknown as Record<string, unknown>).onboardingComplete = token.onboardingComplete;
      }
      return session;
    },
  },
});
