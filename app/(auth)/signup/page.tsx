import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Phone login comes next. For now, use email so we can get your first group running.
      </p>
      <AuthForm mode="signup" />
    </div>
  );
}
