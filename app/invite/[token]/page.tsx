import Link from "next/link";
import { AcceptInviteButton } from "@/components/groups/accept-invite-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupees, groupTypeLabel } from "@/lib/format";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isSupabaseConfigured()) {
    return <p className="p-6">Supabase is not configured yet.</p>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: preview } = await supabase.rpc("get_invite_preview", {
    p_token: token,
  });
  const group = Array.isArray(preview) ? preview[0] : preview;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <Card className="p-6">
        <p className="text-sm font-semibold text-primary">Group invite</p>
        <h1 className="mt-2 text-3xl font-bold">{group?.group_name ?? "Bhishi group"}</h1>
        {group ? (
          <p className="mt-2 text-muted-foreground">
            {groupTypeLabel(group.group_type)} · {formatRupees(group.contribution_amount)} each cycle
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">
            If this link looks wrong, ask the organiser to send a new invite.
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          This app is only a register. It does not collect or hold the pool money.
        </p>
        <div className="mt-6">
          {user ? (
            <AcceptInviteButton token={token} />
          ) : (
            <Button asChild className="w-full">
              <Link href={`/login?next=/invite/${token}`}>Sign in to join</Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
