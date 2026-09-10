import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Verify that the user is authenticated.
 * Redirects to /login if no valid session exists.
 * Use in Server Components and Route Handlers.
 */
export async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
