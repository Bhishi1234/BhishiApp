import { requireCompleteProfile } from "@/lib/profile";

export default async function GroupsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompleteProfile();
  return children;
}
