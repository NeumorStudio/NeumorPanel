import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { registerLogin } from "./lib/access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ profile }) {
      const login = profile?.login;
      if (typeof login !== "string") return false;
      return registerLogin(login, profile?.name, profile?.avatar_url as string | undefined);
    },
  },
});
