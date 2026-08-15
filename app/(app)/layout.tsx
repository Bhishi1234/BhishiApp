import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { getCurrentProfile } from "@/lib/group-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    const { user } = await getCurrentProfile();
    if (!user) redirect("/login");
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
