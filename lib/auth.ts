import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { turso } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER_GOOGLE_CLIENT_ID",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER_GOOGLE_CLIENT_SECRET",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Check if user exists in database
        const result = await turso.execute({
          sql: "SELECT id FROM users WHERE id = ?",
          args: [user.id],
        });

        // If user doesn't exist, create them
        if (result.rows.length === 0) {
          await turso.execute({
            sql: "INSERT INTO users (id, email, name, image) VALUES (?, ?, ?, ?)",
            args: [
              user.id,
              user.email || null,
              user.name || null,
              user.image || null,
            ],
          });
          console.log("Created new user in database:", user.id);
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        // Still allow sign-in even if DB fails
        return true;
      }
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
};
