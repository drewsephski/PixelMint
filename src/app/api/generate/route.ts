import * as fal from "@fal-ai/serverless-client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
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
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Fal.ai error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
