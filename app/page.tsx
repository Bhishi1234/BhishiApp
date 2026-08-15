import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
          भ
        </div>
        <div>
          <p className="text-lg font-bold">Bhishi</p>
          <p className="text-sm text-muted-foreground">भिशी · कमेटी · बचत गट</p>
        </div>
      </div>

      <h1 className="text-4xl font-bold leading-tight tracking-tight">
        Keep your group register in one place.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Track who paid, run a lucky draw, and send WhatsApp reminders. This app
        never collects or holds the pool money — payments stay between members.
      </p>

      <div className="mt-8 space-y-3">
        {[
          "Lucky Draw and Bidding groups",
          "Paid / unpaid grid for every cycle",
          "WhatsApp invites and reminders",
        ].map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm">
            <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" />
            <p className="font-medium">{item}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-3 pt-10">
        <Button asChild className="w-full" size="lg">
          <Link href="/signup">Create account</Link>
        </Button>
        <Button asChild variant="outline" className="w-full" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Not an investment app. No guaranteed returns. The organiser is
          responsible for how their own group is run.
        </p>
      </div>
    </div>
  );
}
