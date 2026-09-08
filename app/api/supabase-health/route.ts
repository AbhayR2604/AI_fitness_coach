import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.getSession();
    if (error) {
      return NextResponse.json({ connected: false, error: error.message }, { status: 502 });
    }
    return NextResponse.json({ connected: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase connection failed.";
    return NextResponse.json({ connected: false, error: message }, { status: 500 });
  }
}
