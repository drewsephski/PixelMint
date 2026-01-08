import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const priceId = session.metadata?.priceId;

    if (!userId || !priceId) {
      console.error("Missing userId or priceId in checkout session metadata");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    let creditsToAdd = 0;
    switch (priceId) {
      case "price_1SnLuDDfHkj3MZlTBqJyqrA8":
        creditsToAdd = 10;
        break;
      case "price_1SnLuJDfHkj3MZlTP2HheMjp":
        creditsToAdd = 50;
        break;
      case "price_1SnLuLDfHkj3MZlTMPVFfWyj":
        creditsToAdd = 250;
        break;
      default:
        console.error(`Unknown priceId: ${priceId}`);
        return NextResponse.json({ error: "Unknown priceId" }, { status: 400 });
    }

    try {
      // Use RPC or a single atomic update if possible, but here we do a fetch-and-update
      // Or even better, use an upsert with an increment if Supabase supported it directly in one call without a function
      // For now, let's keep the logic but make it cleaner.
      
      const { data: currentData, error: fetchError } = await supabaseAdmin
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      const currentCredits = currentData?.credits || 0;
      const newCredits = currentCredits + creditsToAdd;

      const { error: upsertError } = await supabaseAdmin
        .from("user_credits")
        .upsert(
          { 
            user_id: userId, 
            credits: newCredits,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        );

      if (upsertError) throw upsertError;

      console.log(`Successfully added ${creditsToAdd} credits to user ${userId}. New total: ${newCredits}`);
    } catch (error) {
      console.error("Error updating user credits in webhook:", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
