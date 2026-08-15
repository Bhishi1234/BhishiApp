"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { digitsOnly } from "@/lib/format";

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in first." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const upiId = String(formData.get("upiId") ?? "").trim();
  const phone = phoneRaw ? digitsOnly(phoneRaw) : null;

  if (fullName.length < 2) return { error: "Please enter your name." };
  if (phone && phone.length < 10) return { error: "Enter a valid 10-digit phone number." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      upi_id: upiId || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/groups");
  return { success: true };
}
