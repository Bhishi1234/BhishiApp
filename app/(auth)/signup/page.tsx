import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand/mark";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentProfile } from "@/lib/group-data";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const { user } = await getCurrentProfile();
  if (user) redirect("/groups");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <BrandMark href="/" />
      <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-2 mb-8 text-[15px] leading-relaxed text-muted-foreground">
        Phone login comes later. Use email for now so you can start the first group register.
      </p>
      <AuthForm mode="signup" />
    </div>
  );
}
