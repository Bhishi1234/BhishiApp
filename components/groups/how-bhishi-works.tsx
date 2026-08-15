import { Card } from "@/components/ui/card";

const steps = [
  {
    title: "Pay hapta",
    body: "Every member puts in the same amount each month. The app only ticks who paid — money stays between people.",
  },
  {
    title: "Draw one chitthi",
    body: "On the meeting day, one name is drawn. Traditional Bhishi allows this once a month, not sooner.",
  },
  {
    title: "Winner takes the pool",
    body: "That person receives the lump sum. They keep paying hapta, but their name stays out of later draws.",
  },
  {
    title: "Everyone gets a turn",
    body: "Members equal months. When the last person has received the pool, the Bhishi is complete.",
  },
];

export function HowBhishiWorks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {steps.map((step, index) => (
        <Card key={step.title} className="flex gap-3 p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {index + 1}
          </span>
          <div>
            <p className="font-semibold">{step.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
