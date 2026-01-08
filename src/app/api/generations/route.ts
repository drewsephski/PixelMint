import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Type definitions
interface Generation {
  id: string;
  created_at: string;
  user_id: string;
  prompt: string;
  style: string;
  aspect_ratio: string;
  image_url: string;
  storage_path: string;
}

/**
 * GET /api/generations - Fetch user's past generations
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Fetch user's generations from database
    const { data: generations, error } = await supabaseAdmin
      .from("generations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50); // Limit to prevent too many results

    if (error) {
      console.error("[API Error] Failed to fetch generations:", error);
      return NextResponse.json(
        { error: "Failed to fetch generations" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        generations: generations || [],
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    console.error("[API Error]", errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}