"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { indianMobile } from "@/lib/format";

export async function addMemberAction(groupId: string, displayName: string, phone?: string) {
  const supabase = await createClient();
  const mobile = phone ? indianMobile(phone) : "";
  if (phone && mobile.length !== 10) {
    return { error: "Enter a valid 10-digit mobile number." };
  }

  const { error } = await supabase.rpc("add_group_member", {
    p_group_id: groupId,
    p_display_name: displayName,
    p_phone: mobile || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/members`);
  revalidatePath(`/groups/${groupId}/grid`);
  revalidatePath("/groups");
  revalidatePath("/alerts");
  return { success: true };
}

export async function claimPhoneInviteAction(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_phone_invite", {
    p_member_id: memberId,
  });
  if (error) return { error: error.message };
  revalidatePath("/groups");
  revalidatePath("/alerts");
  redirect(`/groups/${data}`);
}
