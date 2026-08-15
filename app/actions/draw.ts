"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function runLuckyDrawAction(cycleId: string, groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_lucky_draw", {
    p_cycle_id: cycleId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/draw`);
  revalidatePath("/alerts");
  return { result: data as { winner_member_id: string; winner_name: string } };
}
