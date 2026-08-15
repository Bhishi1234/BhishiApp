"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CycleFrequency, GroupType } from "@/lib/types";

export async function createGroupAction(input: {
  name: string;
  type: GroupType;
  amount: number;
  memberCount: number;
  frequency: CycleFrequency;
  startDate: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in first." };

  if (input.type === "loan") {
    return { error: "Loan groups are not available in this version." };
  }

  const { data, error } = await supabase.rpc("create_group", {
    p_name: input.name,
    p_type: input.type,
    p_amount: input.amount,
    p_member_count: input.memberCount,
    p_frequency: input.frequency,
    p_start_date: input.startDate,
  });

  if (error) return { error: error.message };
  revalidatePath("/groups");
  redirect(`/groups/${data}`);
}

export async function createInviteAction(groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_group_invite", {
    p_group_id: groupId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return { token: data as string };
}

export async function acceptInviteAction(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", {
    p_token: token,
  });
  if (error) return { error: error.message };
  revalidatePath("/groups");
  redirect(`/groups/${data}`);
}

export async function updateSettingsAction(formData: FormData) {
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") ?? "");
  const { error } = await supabase.rpc("update_group_settings", {
    p_group_id: groupId,
    p_late_fee_notes: String(formData.get("lateFeeNotes") ?? ""),
    p_dropout_notes: String(formData.get("dropoutNotes") ?? ""),
    p_reminder_days_before: Number(formData.get("reminderDays") ?? 3),
    p_self_serve_paid: formData.get("selfServePaid") === "true",
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}/settings`);
  return { success: true };
}

export async function deleteGroupAction(groupId: string, confirmName: string) {
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .single();
  if (!group) return { error: "Group not found." };
  if (confirmName.trim() !== group.name) {
    return { error: "Type the group name exactly to delete it." };
  }

  const { error } = await supabase.rpc("delete_group", {
    p_group_id: groupId,
  });
  if (error) return { error: error.message };
  revalidatePath("/groups");
  redirect("/groups");
}

export async function markPayoutSentAction(cycleId: string, groupId: string, upiRef?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_payout_sent", {
    p_cycle_id: cycleId,
    p_upi_ref: upiRef ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function postponeCycleAction(input: {
  cycleId: string;
  groupId: string;
  newDue: string;
  note?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("postpone_cycle", {
    p_cycle_id: input.cycleId,
    p_new_due: input.newDue,
    p_note: input.note ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${input.groupId}`);
  revalidatePath(`/groups/${input.groupId}/draw`);
  revalidatePath(`/groups/${input.groupId}/grid`);
  revalidatePath("/groups");
  revalidatePath("/alerts");
  return { success: true };
}
