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

// Create a new ratelimiter, that allows 2 requests per 30 seconds for video generation (more expensive)
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(2, "30s"),
  analytics: true,
});

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit the user
  const identifier = userId;
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded. Video generation is resource-intensive, please wait before generating another video." }, { status: 429 });
  }

  const { prompt, aspectRatio, duration, generateAudio, model } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Calculate credits based on duration and audio with better profit margins
  const durationSeconds = parseInt(duration.replace('s', ''));

  let creditCost;
  if (!generateAudio) {
    // No audio: keep current pricing (good margins already)
    creditCost = durationSeconds === 4 ? 2 : durationSeconds === 6 ? 3 : 4;
  } else {
    // With audio: increased pricing for better profit on expensive videos
    if (durationSeconds === 4) creditCost = 4;      // $0.12 (200% profit vs $0.60 cost)
    else if (durationSeconds === 6) creditCost = 8; // $0.24 (267% profit vs $0.90 cost)
    else creditCost = 12;                           // $0.36 (300% profit vs $1.20 cost)
  }

  const costToYou = generateAudio ? durationSeconds * 0.15 : durationSeconds * 0.10;
  const chargeToUser = creditCost * 0.03;
  console.log(`Video generation: ${duration} = ${durationSeconds}s, audio=${generateAudio}, cost to you=$${costToYou}, charge to user=$${chargeToUser}, profit=$${chargeToUser - costToYou}, credits=${creditCost}`);

  console.log(`Video generation request: model=${model}, cost=${creditCost} credits, estimated FAL AI cost: $${(creditCost * 0.03).toFixed(2)}`);

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

  if (!userCredits || userCredits.credits < creditCost) {
    return NextResponse.json({
      error: `Not enough credits. ${model} video generation costs ${creditCost} credits.`
    }, { status: 403 });
  }

  // Deduct credits for video generation
  const { error: deductError } = await supabaseAdmin
    .from("user_credits")
    .update({ credits: userCredits.credits - creditCost })
    .eq("user_id", userId);

  if (deductError) {
    console.error("Error deducting credits:", deductError);
    return NextResponse.json({ error: deductError.message }, { status: 500 });
  }

  try {
    // Validate aspect ratio and duration are supported
    const validAspectRatios = ["landscape", "portrait"];
    const validDurations = ["4s", "6s", "8s"];

    if (!validAspectRatios.includes(aspectRatio)) {
      return NextResponse.json({
        error: `Invalid aspect ratio: ${aspectRatio}. Supported: ${validAspectRatios.join(", ")}`
      }, { status: 400 });
    }

    if (!validDurations.includes(duration)) {
      return NextResponse.json({
        error: `Invalid duration: ${duration}. Supported: ${validDurations.join(", ")}`
      }, { status: 400 });
    }

    // Map aspect ratios for Veo3 fast
    const aspectRatioMap: { [key: string]: "16:9" | "9:16" } = {
      landscape: "16:9",
      portrait: "9:16",
    };

    const veoAspectRatio = aspectRatioMap[aspectRatio] || "16:9";

    console.log(`Generating video with Veo3 Fast: prompt="${prompt}", aspect_ratio=${veoAspectRatio}, duration=${duration}, audio=${generateAudio}`);

    // Generate video using FAL AI Veo3 Fast
    const result = await fal.run("fal-ai/veo3/fast", {
      input: {
        prompt: prompt,
        aspect_ratio: veoAspectRatio,
        duration: duration,
        resolution: "720p", // Default to 720p for cost-effectiveness
        generate_audio: generateAudio,
        auto_fix: true, // Enable auto-fix for prompts
      },
    });

    if (!result.data || !result.data.video || !result.data.video.url) {
      console.error("FAL AI Video Error: No video URL returned", result);
      // Revert credit deduction if generation fails
      await supabaseAdmin
        .from("user_credits")
        .update({ credits: userCredits.credits })
        .eq("user_id", userId);
      return NextResponse.json({ error: "Failed to generate video" }, { status: 500 });
    }

    const videoUrl = result.data.video.url;

    // Store video generation details in Supabase
    const { error: insertError } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: userId,
        prompt: prompt,
        style: `video-${model}`,
        aspect_ratio: veoAspectRatio,
        image_url: videoUrl, // Store video URL in image_url field for now
        storage_path: `video-${Date.now()}`,
        metadata: {
          type: 'video',
          model: "fal-ai/veo3/fast",
          credits_used: creditCost,
          duration: duration,
          resolution: "720p",
          audio: generateAudio
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting video generation record:", insertError);
      // Revert credit deduction if database insert fails
      await supabaseAdmin
        .from("user_credits")
        .update({ credits: userCredits.credits })
        .eq("user_id", userId);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        video: { url: videoUrl },
        aspect_ratio: veoAspectRatio,
        duration: duration,
        resolution: "720p",
        audio: generateAudio,
        model: "fal-ai/veo3/fast"
      }
    });
  } catch (error) {
    console.error("Video generation failed:", error);
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