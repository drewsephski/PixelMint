import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * DELETE /api/generations/[id] - Delete a specific generation
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch the generation record to get the storage path and verify ownership
    const { data: generation, error: fetchError } = await supabaseAdmin
      .from("generations")
      .select("user_id, storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    if (generation.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Delete from Supabase Storage
    if (generation.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("generations")
        .remove([generation.storage_path]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // We continue even if storage delete fails to ensure DB is cleaned up, 
        // or you could halt here depending on preference.
      }
    }

    // 3. Delete from Database
    const { error: dbError } = await supabaseAdmin
      .from("generations")
      .delete()
      .eq("id", id);

    if (dbError) {
      throw new Error(`Database deletion failed: ${dbError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deletion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
