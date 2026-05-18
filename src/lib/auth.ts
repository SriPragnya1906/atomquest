import { NextRequest } from 'next/server';
import { prisma } from './db';
import { getServerSession } from "next-auth/next";
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const isMicrosoftSSOConfigured = !!process.env.AZURE_AD_CLIENT_ID;

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "dummy-client-secret",
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.userId = dbUser.id;
        } else {
          // Auto-create or map
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || "Enterprise User",
              passwordHash: "SSO_USER",
              role: "EMPLOYEE",
              department: "Enterprise",
            },
          });
          token.role = newUser.role;
          token.userId = newUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "atomquest_fallback_nextauth_secret_key_9988",
};

export async function getSessionUser(request: NextRequest) {
  // 1. Try NextAuth session first if SSO is configured
  if (isMicrosoftSSOConfigured) {
    try {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        const userId = (session.user as any).id;
        if (userId) {
          return await prisma.user.findUnique({
            where: { id: userId },
            include: { manager: true }
          });
        }
      }
    } catch (e) {
      console.warn("NextAuth session resolution failed:", e);
    }
  }

  // 2. Fallback to mock user ID header or cookie
  const userId = request.headers.get('x-mock-user-id') || request.cookies.get('mock_user_id')?.value;

  if (!userId) {
    // Default fallback to first seeded Employee (Alex Rivera)
    return await prisma.user.findFirst({
      where: { email: 'employee1@atomquest.com' },
      include: { manager: true }
    });
  }

  return await prisma.user.findUnique({
    where: { id: userId },
    include: { manager: true }
  });
}
