import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

// Sin sesión → /login. (La comprobación de "¿sigue en el equipo?" se hace
// en el servidor con requireUser(), que sí puede leer la base de datos.)
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!req.auth && !pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
