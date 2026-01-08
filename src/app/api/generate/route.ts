import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { fal } from "@fal-ai/client";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Initialize Redis for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create a new ratelimiter, that allows 3 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(3, "10s"),
  analytics: true,
});

// Fixed credit checking to use supabaseAdmin client
export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  // Rate limit the user
  const identifier = userId;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { prompt, imageSize } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Check user credits
  const { data: userCredits, error: creditsError } = await supabaseAdmin
    .from("user_credits")
    .select("credits")
    .eq("user_id", userId)
    .single();

  if (creditsError) {
    console.error("Error fetching user credits:", creditsError);
    if (creditsError.code === "PGRST116") {
      return NextResponse.json({ error: "No credits found. Please purchase credits." }, { status: 403 });
    }
    return NextResponse.json({ error: creditsError.message }, { status: 500 });
  }

  if (!userCredits || userCredits.credits <= 0) {
    return NextResponse.json({ error: "Not enough credits" }, { status: 403 });
  }

  // Deduct one credit
  const { error: deductError } = await supabaseAdmin
    .from("user_credits")
    .update({ credits: userCredits.credits - 1 })
    .eq("user_id", userId);

  if (deductError) {
    console.error("Error deducting credit:", deductError);
    return NextResponse.json({ error: deductError.message }, { status: 500 });
  }

  try {
    const aspectRatios: { [key: string]: "square_hd" | "landscape_4_3" | "landscape_16_9" | "square" | "portrait_4_3" | "portrait_16_9" } = {
      square_hd: "square_hd",
      landscape_4_3: "landscape_4_3",
      landscape_16_9: "landscape_16_9",
    };
    const aspectRatio = aspectRatios[imageSize as string] || "square_hd";

    const result = await fal.run(
      "fal-ai/flux/schnell", // Fast text-to-image model
      {
        input: {
          prompt: prompt,
          image_size: aspectRatio,
          num_inference_steps: 4, // Faster generation
          seed: 42, // For reproducibility, can be randomized
        },
      }
    );

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      console.error("Fal AI API Error: No images returned");
      // Revert credit deduction if generation fails
      await supabaseAdmin
        .from("user_credits")
        .update({ credits: userCredits.credits })
        .eq("user_id", userId);
      return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
    }

    const imageUrl = result.data.images[0].url;

    // Store generation details in Supabase
    const { error: insertError } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: userId,
        prompt: prompt,
        style: "flux",
        aspect_ratio: imageSize,
        image_url: imageUrl,
        storage_path: "N/A",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting generation record:", insertError);
      // Revert credit deduction if database insert fails
      await supabaseAdmin
        .from("user_credits")
        .update({ credits: userCredits.credits })
        .eq("user_id", userId);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { images: [{ url: imageUrl }], original_url: imageUrl } });
  } catch (error) {
    console.error("Image generation failed:", error);
    // Revert credit deduction if any other error occurs
    await supabaseAdmin
      .from("user_credits")
      .update({ credits: userCredits.credits })
      .eq("user_id", userId);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
