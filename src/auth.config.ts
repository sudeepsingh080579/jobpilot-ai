import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { secureCookiesEnabled } from "@/lib/deploy";

const publicPaths = new Set(["/", "/login", "/register", "/offline"]);

export const authConfig = {
  trustHost: true,
  useSecureCookies: secureCookiesEnabled(process.env),
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (publicPaths.has(pathname)) return true;
      if (auth?.user) return true;
      return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.nextUrl));
    },
  },
} satisfies NextAuthConfig;
