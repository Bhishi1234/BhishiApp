import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getCurrentProfile } from "@/lib/group-data";
import { parseLocale } from "@/lib/i18n";
import { isProfileComplete } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let showNav = true;
  let locale = parseLocale("en");

  if (isSupabaseConfigured()) {
    const { user, profile } = await getCurrentProfile();
    if (!user) redirect("/login");
    showNav = isProfileComplete(profile);
    locale = parseLocale(profile?.locale);
  }

  return (
    <LocaleProvider locale={locale}>
      <div className={showNav ? "mx-auto min-h-dvh w-full max-w-lg pb-24" : "mx-auto min-h-dvh w-full max-w-lg"}>
        {children}
        {showNav ? <BottomNav /> : null}
      </div>
    </LocaleProvider>
  );
}
