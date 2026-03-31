import { auth } from "./auth";

export async function getUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}
