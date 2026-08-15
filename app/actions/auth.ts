"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2) return { error: "Please enter your name." };
  if (!email.includes("@")) return { error: "Please enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) return { error: error.message };
  if (!data.session) {
    return {
      error:
        "Check your email to confirm the account, then sign in. For local testing, turn off Confirm email in Supabase Auth settings.",
    };
  }
  redirect("/groups");
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
