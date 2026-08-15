import { notFound } from "next/navigation";
import { AddMemberForm } from "@/components/groups/add-member-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatPhone } from "@/lib/format";
import { getGroupBundle } from "@/lib/group-data";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getGroupBundle(id);
  if (!bundle) notFound();

  const wonIds = new Set(bundle.payouts.map((row) => row.winner_member_id));

  return (
    <div className="px-5 py-6">
      <PageHeader
        backHref={`/groups/${id}`}
        backLabel={bundle.group.name}
        title="Members"
        subtitle="People do not need an account yet. Add a mobile number and they will see this group when they sign in with it."
      />

      {bundle.isAdmin ? (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold">Add someone to the register</p>
          <AddMemberForm groupId={id} />
        </Card>
      ) : null}

      <div className="mt-5 space-y-3">
        {bundle.members.map((member) => (
          <Card key={member.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{member.display_name}</p>
                <p className="text-sm text-muted-foreground">{formatPhone(member.phone)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {wonIds.has(member.id) ? (
                  <Badge className="bg-accent text-accent-foreground">Received pool</Badge>
                ) : (
                  <Badge>Still eligible</Badge>
                )}
                <p className="text-xs font-semibold capitalize text-muted-foreground">
                  {member.role.replace("_", " ")}
                  {member.user_id ? "" : " · invited"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
