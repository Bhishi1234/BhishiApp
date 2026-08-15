import { BottomNav } from "@/components/layout/bottom-nav";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
