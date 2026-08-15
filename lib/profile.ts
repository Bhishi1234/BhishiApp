import { redirect } from "next/navigation";
import { indianMobile } from "@/lib/format";
import { getCurrentProfile } from "@/lib/group-data";
import type { Profile } from "@/lib/types";

export function isProfileComplete(profile: Profile | null | undefined) {
  if (!profile) return false;
  const name = profile.full_name?.trim() ?? "";
  return name.length >= 2 && indianMobile(profile.phone).length === 10;
}

export async function requireCompleteProfile() {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");
  if (!isProfileComplete(profile)) redirect("/profile?setup=1");
}
