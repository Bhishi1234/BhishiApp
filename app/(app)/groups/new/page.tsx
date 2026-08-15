import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateWizard } from "@/components/groups/create-wizard";

export default function NewGroupPage() {
  return (
    <div className="px-5 py-6">
      <Link href="/groups" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <CreateWizard />
    </div>
  );
}
