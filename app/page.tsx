import Link from "next/link";
import { BrandMark } from "@/components/brand/mark";
import { HowBhishiWorks } from "@/components/groups/how-bhishi-works";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <BrandMark />

      <h1 className="mt-10 text-[2.15rem] leading-[1.15] font-bold tracking-tight">
        The group register for a monthly Bhishi.
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
        Members pay hapta. On meeting day you draw one chitthi. That person takes
        the pool. Everyone keeps paying until each person has received it once.
        This app never holds the money.
      </p>

      <div className="mt-8 space-y-3">
        <Button asChild className="w-full" size="lg">
          <Link href="/signup">Create account</Link>
        </Button>
        <Button asChild variant="outline" className="w-full" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>

      <div className="mt-10">
        <p className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          How a Bhishi runs
        </p>
        <HowBhishiWorks />
      </div>

      <p className="mt-8 pb-4 text-center text-xs leading-relaxed text-muted-foreground">
        For informal neighbourhood groups. Not a registered chit fund, bank, or
        investment product. The organiser is responsible for how their group is run.
      </p>
    </div>
  );
}
