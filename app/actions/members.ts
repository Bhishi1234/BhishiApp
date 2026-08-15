"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { indianMobile } from "@/lib/format";

export async function addMemberAction(groupId: string, displayName: string, phone?: string) {
  const supabase = await createClient();
  const mobile = indianMobile(phone);
  if (mobile.length !== 10) {
    return { error: "Mobile number is required." };
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

export async function leaveGroupAction(groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_group", {
    p_group_id: groupId,
  });
  if (error) return { error: error.message };
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/members`);
  revalidatePath("/alerts");
  redirect("/groups");
}

export async function replaceMemberAction(input: {
  memberId: string;
  groupId: string;
  displayName: string;
  phone: string;
}) {
  const supabase = await createClient();
  const mobile = indianMobile(input.phone);
  if (mobile.length !== 10) {
    return { error: "Mobile number is required." };
  }
  const { error } = await supabase.rpc("replace_group_member", {
    p_member_id: input.memberId,
    p_display_name: input.displayName,
    p_phone: mobile,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${input.groupId}`);
  revalidatePath(`/groups/${input.groupId}/members`);
  revalidatePath(`/groups/${input.groupId}/grid`);
  revalidatePath("/groups");
  revalidatePath("/alerts");
  return { success: true };
}
