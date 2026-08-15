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
        subtitle="Set hapta, members, and the first meeting date. The chitthi stays locked until that day."
      />
      <CreateWizard />
    </div>
  );
}
