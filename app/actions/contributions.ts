"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContributionStatus, PaymentMode } from "@/lib/types";

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
  revalidatePath(`/groups/${input.groupId}`);
  revalidatePath(`/groups/${input.groupId}/grid`);
  revalidatePath("/alerts");
  return { success: true };
}
