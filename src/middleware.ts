import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  },
  callbacks: {
    authorized({ req, token }) {
      if (req.nextUrl.pathname.startsWith("/admin")) {
        return token?.role === "Admin";
      }

      return Boolean(token);
    }
  }
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/applications/:path*",
    "/dashboard/:path*",
    "/master-cv/:path*",
    "/optimize/:path*"
  ]
};
