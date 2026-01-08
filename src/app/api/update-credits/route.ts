import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = clerkUserId;

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 400 });
    }

    const { userId: sessionUserId, priceId } = session.metadata || {};
    console.log("Stripe session priceId:", priceId);

    if (sessionUserId !== userId) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
    }

    // Determine credit amount based on priceId (you'll need to map price IDs to credit amounts)
    // For demonstration, let's assume priceId "price_123" gives 100 credits
    let creditsToAdd = 0;
    if (priceId === "price_1SnK4tRY4K4exiDkN5PLppld") {
        creditsToAdd = 10;
    } else if (priceId === "price_1SnK55RY4K4exiDk9X1V8yvV") {
        creditsToAdd = 50;
    } else if (priceId === "price_1SnK5RRY4K4exiDkmyVWqtJU") {
        creditsToAdd = 250;
    } else {
        return NextResponse.json({ error: "Unknown price ID" }, { status: 400 });
    }


    // Check if user_credits entry exists
    const { data: existingCredits, error: fetchError } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 means no rows found
      console.error("Error fetching existing credits:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let newCredits = creditsToAdd;
    if (existingCredits) {
      newCredits += existingCredits.credits;
    }

    // Try to update first
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("user_credits")
      .update({ credits: newCredits })
      .eq("user_id", userId)
      .select();

    if (updateError) {
      console.error("Error updating credits:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If no rows were updated, insert a new row
    if (!updateData || updateData.length === 0) {
      const { error: insertError } = await supabaseAdmin
        .from("user_credits")
        .insert({ user_id: userId, credits: newCredits });

      if (insertError) {
        console.error("Error inserting credits:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    if (updateError) {
      console.error("Error updating credits:", updateError);
      return NextResponse.json({ error: "Error updating credits" }, { status: 500 });
    }

    return NextResponse.json({ success: true, newCredits });
  } catch (error) {
    console.error("Credit update failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
