import { auth } from "@/lib/auth-edge";

export default auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
