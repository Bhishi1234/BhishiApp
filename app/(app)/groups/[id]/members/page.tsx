import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AddMemberForm } from "@/components/groups/add-member-form";
import { Card } from "@/components/ui/card";
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

  return (
    <div className="px-5 py-6">
      <Link href={`/groups/${id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft className="size-4" /> {bundle.group.name}
      </Link>
      <h1 className="text-3xl font-bold">Members</h1>
      <p className="mt-2 text-muted-foreground">
        People do not need an account yet. Add them by name, then share the invite.
      </p>

      {bundle.isAdmin ? (
        <Card className="mt-5 p-5">
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
              <p className="text-xs font-semibold capitalize text-muted-foreground">
                {member.role.replace("_", " ")}
                {member.user_id ? "" : " · not joined yet"}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
