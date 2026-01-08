import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, imageSize, numInferenceSteps } = await request.json();

    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: imageSize || "square_hd",
        num_inference_steps: numInferenceSteps || 4,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    }) as { data: { images: { url: string }[] } };

    const generatedImageUrl = result.data.images[0].url;

    // Fetch the image to upload to Supabase
    const imageResponse = await fetch(generatedImageUrl);
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
      style: "flux-schnell", // Storing model/style info
      aspect_ratio: imageSize || "square_hd",
      image_url: publicUrl,
      storage_path: filePath,
    });

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // Return the result with the persistent URL
    return NextResponse.json({
      data: {
        images: [{ url: publicUrl }],
        original_url: generatedImageUrl,
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
