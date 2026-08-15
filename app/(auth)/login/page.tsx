import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand/mark";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentProfile } from "@/lib/group-data";
import { isProfileComplete } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { user, profile } = await getCurrentProfile();
  if (user) redirect(isProfileComplete(profile) ? "/groups" : "/profile?setup=1");

  const { next } = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <BrandMark href="/" />
      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 mb-8 text-[15px] leading-relaxed text-muted-foreground">
        Sign in to see hapta, meeting dates, and who has already received the pool.
      </p>
      <AuthForm mode="login" nextPath={next || "/groups"} />
    </div>
  );
}
