import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentProfile } from "@/lib/group-data";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { user } = await getCurrentProfile();
  if (user) redirect("/groups");

  const { next } = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Sign in to see your groups, payments, and alerts.
      </p>
      <AuthForm mode="login" nextPath={next || "/groups"} />
    </div>
  );
}
