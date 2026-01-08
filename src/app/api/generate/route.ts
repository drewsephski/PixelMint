import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.error("Generate API: Unauthorized - No userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, imageSize, numInferenceSteps } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    console.log(`Generating image for user ${userId} with prompt: ${prompt}`);

    const result = (await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: (imageSize || "square_hd") as any,
        num_inference_steps: numInferenceSteps || 4,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    })) as unknown as { data: { images: { url: string }[] } };

    console.log("Fal.ai result received");

    if (!result.data?.images || result.data.images.length === 0) {
      throw new Error("Fal.ai returned no images");
    }

    const generatedImageUrl = result.data.images[0].url;

    // Fetch the image to upload to Supabase
    const imageResponse = await fetch(generatedImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from Fal: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // Generate a unique path
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}.jpg`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("generations")
      .upload(filePath, imageBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage Error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("generations")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Save to Database
    const { error: dbError } = await supabaseAdmin.from("generations").insert({
      user_id: userId,
      prompt,
      style: "flux-schnell",
      aspect_ratio: imageSize || "square_hd",
      image_url: publicUrl,
      storage_path: filePath,
    });

    if (dbError) {
      console.error("Supabase DB Error:", dbError);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    console.log("Generation successful and saved to Supabase");

    // Return the result with the persistent URL
    return NextResponse.json({
      data: {
        images: [{ url: publicUrl }],
        original_url: generatedImageUrl,
      },
    });
  } catch (error) {
    console.error("Generation error details:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 }
    );
  }
}