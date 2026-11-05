import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

// Parte de la configuración sin acceso a base de datos:
// la usa también proxy.ts para comprobar rápido si hay sesión.
export default {
  providers: [GitHub],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    jwt({ token, profile }) {
      // `profile` solo llega al iniciar sesión
      if (profile?.login) token.login = String(profile.login);
      return token;
    },
    session({ session, token }) {
      session.login = token.login as string | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
