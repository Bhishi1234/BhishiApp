"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function refreshDraw(groupId: string) {
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/draw`);
  revalidatePath("/alerts");
}

export async function runLuckyDrawAction(cycleId: string, groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_lucky_draw", {
    p_cycle_id: cycleId,
  });
  if (error) return { error: error.message };
  refreshDraw(groupId);
  return { result: data as { winner_member_id: string; winner_name: string } };
}

export async function acceptPayoutAction(cycleId: string, groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_payout", { p_cycle_id: cycleId });
  if (error) return { error: error.message };
  refreshDraw(groupId);
  return { success: true };
}

export async function requestPayoutTransferAction(cycleId: string, groupId: string, toMemberId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_payout_transfer", {
    p_cycle_id: cycleId,
    p_to_member_id: toMemberId,
  });
  if (error) return { error: error.message };
  refreshDraw(groupId);
  return { success: true };
}

export async function decidePayoutTransferAction(cycleId: string, groupId: string, approve: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_payout_transfer", {
    p_cycle_id: cycleId,
    p_approve: approve,
  });
  if (error) return { error: error.message };
  refreshDraw(groupId);
  return { success: true };
}

export async function setBidWindowAction(input: {
  cycleId: string;
  groupId: string;
  opensAt: string;
  closesAt: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_bid_window", {
    p_cycle_id: input.cycleId,
    p_opens_at: new Date(input.opensAt).toISOString(),
    p_closes_at: new Date(input.closesAt).toISOString(),
  });
  if (error) return { error: error.message };
  refreshDraw(input.groupId);
  return { success: true };
}

export async function upsertBidAction(cycleId: string, groupId: string, discount: number, memberId?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_bid", {
    p_cycle_id: cycleId,
    p_discount: discount,
    p_member_id: memberId ?? null,
  });
  if (error) return { error: error.message };
  refreshDraw(groupId);
  return { success: true };
}

export async function closeBiddingAction(cycleId: string, groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_bidding", { p_cycle_id: cycleId });
  if (error) return { error: error.message };
  refreshDraw(groupId);
  return {
    result: data as {
      winner_member_id: string;
      winner_name: string;
      discount: number;
      bonus_per_member: number;
      winner_takes: number;
    },
  };
}
