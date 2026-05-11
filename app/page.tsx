import Flow from "./components/Flow";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function Home() {
  let user: { id: string; email: string | null } | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      user = { id: authUser.id, email: authUser.email ?? null };
    }
  }

  return <Flow user={user} authEnabled={isSupabaseConfigured()} />;
}
