import { requireCompleteProfile } from "@/lib/profile";

export default async function AlertsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompleteProfile();
  return children;
}
