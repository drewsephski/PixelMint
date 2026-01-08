import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ credits: 0 }, { status: 200 });
  }

  const userId = clerkUserId;

  const { data, error } = await supabaseAdmin
    .from("user_credits")
    .select("credits")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching credits:", error);
    // If no entry exists, return 0 credits
    if (error.code === "PGRST116") {
      return NextResponse.json({ credits: 0 }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ credits: data?.credits || 0 }, { status: 200 });
}
