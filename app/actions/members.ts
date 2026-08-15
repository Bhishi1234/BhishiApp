"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addMemberAction(groupId: string, displayName: string, phone?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_group_member", {
    p_group_id: groupId,
    p_display_name: displayName,
    p_phone: phone || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/members`);
  revalidatePath(`/groups/${groupId}/grid`);
  revalidatePath("/alerts");
  return { success: true };
}
