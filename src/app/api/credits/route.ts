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
    // If no entry exists, create one with 2 free credits for new users
    if (error.code === "PGRST116") {
      try {
        const { error: insertError } = await supabaseAdmin
          .from("user_credits")
          .insert({ user_id: userId, credits: 2 });

        if (insertError) {
          console.error("Error creating initial credits:", insertError);
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        console.log(`Created initial 2 credits for new user: ${userId}`);
        return NextResponse.json({ credits: 2 }, { status: 200 });
      } catch (insertError) {
        console.error("Error creating initial credits:", insertError);
        return NextResponse.json({ error: "Failed to create initial credits" }, { status: 500 });
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ credits: data?.credits || 0 }, { status: 200 });
}
