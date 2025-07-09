import GoogleProvider from "next-auth/providers/google";
import NextAuth, { NextAuthOptions } from "next-auth";
import { prismaClient } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn(params) {
      if(!params.user.email) {
        return false; // Prevent sign-in if email is not available
      }
      try {
        await prismaClient.user.upsert({
        where: { email: params.user.email },
        update: {},
        create: {
          email: params.user.email,
          name: params.user.name || "",
          provider: "Google",
          role: "Streamer",
        }
      });
      } catch (error) {
        
      }

      return true;
    }
  }
};