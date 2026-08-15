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
  const localeRaw = String(formData.get("locale") ?? "").trim();
  const phone = indianMobile(phoneRaw);
  const setup = String(formData.get("setup") ?? "") === "1";
  const locale = localeRaw === "hi" || localeRaw === "mr" || localeRaw === "en" ? localeRaw : undefined;

  if (fullName.length < 2) return { error: "Please enter your name." };
  if (phone.length !== 10) return { error: "Mobile number is required." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      upi_id: upiId || null,
      ...(locale ? { locale } : {}),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/groups");
  revalidatePath("/alerts");
  if (setup) redirect("/groups");
  return { success: true };
}

export async function updateLocaleAction(locale: "en" | "hi" | "mr") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in first." };

  const { error } = await supabase
    .from("profiles")
    .update({ locale })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/groups");
  revalidatePath("/alerts");
  return { success: true };
}
