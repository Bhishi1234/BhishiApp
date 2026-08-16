import Link from "next/link";
import { BrandMark } from "@/components/brand/mark";
import { HowBhishiWorks } from "@/components/groups/how-bhishi-works";
import { LandingFaq } from "@/components/landing/faq";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    title: "Lucky draw & lilav",
    body: "Draw one chitthi a month, or run an open bidding window. Everyone sees the same register.",
  },
  {
    title: "Multiple hands",
    body: "Ten seats of ₹1,000 can be nine people if someone plays two hands. Each hand pays hapta and can win once.",
  },
  {
    title: "Keep or transfer a win",
    body: "If this month’s winner does not need the money, they can pass it. The organiser approves before anyone is paid.",
  },
  {
    title: "Exit calculator",
    body: "If someone stops mid-cycle, see what they would owe or get back. Settlement stays between people.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <BrandMark />

      <p className="mt-10 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
        Bhishi · Kameti · Committee
      </p>
      <h1 className="mt-3 text-[2.35rem] leading-[1.12] font-bold tracking-tight">
        The register your neighbourhood Bhishi actually uses.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Members pay hapta. One month after you start, you draw the first chitthi. That
        hand takes the pool. Everyone keeps paying until every hand has had a turn.
        Money never sits in this app.
      </p>

      <div className="mt-8 space-y-3">
        <Button asChild className="w-full" size="lg">
          <Link href="/signup">Create a free account</Link>
        </Button>
        <Button asChild variant="outline" className="w-full" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3">
        {features.map((item) => (
          <Card key={item.title} className="p-4">
            <p className="text-[15px] font-semibold leading-snug">{item.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </Card>
        ))}
      </div>

      <section className="mt-12">
        <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-primary uppercase">How it runs</p>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Four steps every month</h2>
        <HowBhishiWorks />
      </section>

      <section className="mt-12">
        <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-primary uppercase">Built for India</p>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Hindi, Marathi, and English</h2>
        <Card className="p-5">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Organisers add people by mobile number. Members claim hapta after they pay
            UPI. Meeting slips print as PDF. Co-organisers can help on meeting day.
            Phone stays for invites — login is still email.
          </p>
        </Card>
      </section>

      <section className="mt-12">
        <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-primary uppercase">Questions</p>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Before you start a group</h2>
        <LandingFaq />
      </section>

      <div className="mt-10 space-y-3">
        <Button asChild className="w-full" size="lg">
          <Link href="/signup">Start a Bhishi</Link>
        </Button>
        <p className="pb-6 text-center text-xs leading-relaxed text-muted-foreground">
          For informal neighbourhood groups. Not a registered chit fund, bank, NBFC, or
          investment product. The organiser is responsible for how their group is run.
        </p>
      </div>
    </div>
  );
}
