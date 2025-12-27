import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const plan = auth?.user?.plan;

      const pathname = nextUrl.pathname;

      //  USAR OS IFS ABAIXO PARA REDIRECIONAR PARA PAGINA QUE QUEREMOS AO SER BARRADO, AINDA NAO TEM ESSAS ROTAS, FOI PARA DEIXAR ESTRUTURADO

      /*EXEMPLO
      if (!isLoggedIn && pathname.startsWith("/dashboard")) {
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
      */

      //  Rotas privadas
      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn;
      }

      // Rotas premium
      if (pathname.startsWith("/premium")) {
        return isLoggedIn && plan === "PREMIUM";
      }

      // Rotas recruiter
      if (pathname.startsWith("/recruiter")) {
        return isLoggedIn && role === "RECRUITER";
      }

      // Rotas admin
      if (pathname.startsWith("/admin")) {
        return isLoggedIn && role === "ADMIN";
      }

      // Público
      return true;
    },
  },

  providers: [],
} satisfies NextAuthConfig;
