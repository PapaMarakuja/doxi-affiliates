import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const result = await getAuthenticatedUser();

  if (!result.data) {
    redirect('/login');
  }

  redirect('/dashboard');
}
