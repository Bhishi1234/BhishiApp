"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { indianMobile } from "@/lib/format";

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const phone = indianMobile(String(formData.get("phone") ?? ""));

  if (fullName.length < 2) return { error: "Please enter your name." };
  if (!email.includes("@")) return { error: "Please enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (phone.length !== 10) return { error: "Enter the 10-digit mobile number used in the group." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
    },
  });

  if (error) return { error: error.message };

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      phone,
    });
  }

  if (!data.session) {
    return {
      error:
        "Check your email to confirm the account, then sign in. For local testing, turn off Confirm email in Supabase Auth settings.",
    };
  }
  redirect("/profile?setup=1");
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/groups");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect(next.startsWith("/") ? next : "/groups");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
