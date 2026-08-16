import { CreateWizard } from "@/components/groups/create-wizard";
import { PageHeader } from "@/components/layout/page-header";

export default function NewGroupPage() {
  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref="/groups"
        backLabel="Groups"
        kicker="नवीन भिशी"
        title="Create a group"
        subtitle="Set hapta, how many hands, and the group start date. One person can play more than one hand."
      />
      <CreateWizard />
    </div>
  );
}
