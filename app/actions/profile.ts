"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { indianMobile } from "@/lib/format";

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in first." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const upiId = String(formData.get("upiId") ?? "").trim();
  const phone = indianMobile(phoneRaw);
  const setup = String(formData.get("setup") ?? "") === "1";

  if (fullName.length < 2) return { error: "Please enter your name." };
  if (phone.length !== 10) return { error: "Mobile number is required." };

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
  if (setup) redirect("/groups");
  return { success: true };
}
