"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContributionStatus, PaymentMode } from "@/lib/types";

function revalidateHapta(groupId: string) {
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/grid`);
  revalidatePath(`/groups/${groupId}/draw`);
  revalidatePath("/alerts");
}

export async function updateContributionAction(input: {
  contributionId: string;
  groupId: string;
  status: ContributionStatus;
  amountPaid?: number;
  paymentMode?: PaymentMode;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_contribution_status", {
    p_contribution_id: input.contributionId,
    p_status: input.status,
    p_amount_paid: input.amountPaid ?? null,
    p_payment_mode: input.paymentMode ?? null,
  });
  if (error) return { error: error.message };
  revalidateHapta(input.groupId);
  return { success: true };
}

export async function updateContributionsAction(input: {
  contributionIds: string[];
  groupId: string;
  status: ContributionStatus;
  amountPaid?: number;
  paymentMode?: PaymentMode;
}) {
  const supabase = await createClient();
  for (const contributionId of input.contributionIds) {
    const { error } = await supabase.rpc("update_contribution_status", {
      p_contribution_id: contributionId,
      p_status: input.status,
      p_amount_paid: input.amountPaid ?? null,
      p_payment_mode: input.paymentMode ?? null,
    });
    if (error) return { error: error.message };
  }
  revalidateHapta(input.groupId);
  return { success: true };
}

export async function claimHaptaManyAction(input: {
  contributionIds: string[];
  groupId: string;
  paymentMode?: PaymentMode;
}) {
  const supabase = await createClient();
  for (const contributionId of input.contributionIds) {
    const { error } = await supabase.rpc("claim_hapta", {
      p_contribution_id: contributionId,
      p_payment_mode: input.paymentMode ?? "upi",
    });
    if (error) return { error: error.message };
  }
  revalidateHapta(input.groupId);
  return { success: true };
}

export async function claimHaptaAction(input: {
  contributionId: string;
  groupId: string;
  paymentMode?: PaymentMode;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_hapta", {
    p_contribution_id: input.contributionId,
    p_payment_mode: input.paymentMode ?? "upi",
  });
  if (error) return { error: error.message };
  revalidateHapta(input.groupId);
  return { success: true };
}
