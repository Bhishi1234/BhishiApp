"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Does Bhishi hold or transfer money?",
    a: "No. Members pay hapta to the organiser by UPI, cash, or bank transfer. The app is only the register — who paid, whose chitthi came, and who received the pool.",
  },
  {
    q: "What is a hand, if one person wants to play twice?",
    a: "A Bhishi of ₹10,000 with ₹1,000 hapta has 10 hands, not always 10 people. Someone can take two hands: they pay ₹2,000 each month and can win twice. The group still runs for 10 months.",
  },
  {
    q: "When is the first chitthi drawn?",
    a: "One month after the group start date (or one week for weekly groups). After that, one winner each meeting — never two in the same month. Past winners stay out of the box.",
  },
  {
    q: "Can a winner pass this month’s pool to someone else?",
    a: "Yes. After the chitthi, the winner can keep it or ask to transfer it. The organiser approves. The person who collects is marked as received; the original winner stays eligible later.",
  },
  {
    q: "How does bidding (lilav) work?",
    a: "The organiser sets an open and close time. Everyone can see every bid and change theirs until the window closes. Lowest discount wins. That amount is split equally among the other hands. The winner takes the pool minus the bid.",
  },
  {
    q: "What if someone wants to stop mid-way?",
    a: "Use the exit settlement calculator on the group. If they have not received the pool, it shows a refund of hapta paid in. If they already received it, it shows remaining hapta still owed. Settlement stays between people — the app does not move money.",
  },
  {
    q: "Is this a registered chit fund or investment product?",
    a: "No. Bhishi is for informal neighbourhood groups (Bhishi, Kameti, Committee). The organiser is responsible for how their group is run. It is not a bank, NBFC, or SEBI-registered product.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {faqs.map((item, index) => {
        const expanded = open === index;
        return (
          <Card key={item.q} className="overflow-hidden p-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              onClick={() => setOpen(expanded ? null : index)}
              aria-expanded={expanded}
            >
              <span className="text-[15px] font-semibold leading-snug">{item.q}</span>
              <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition", expanded && "rotate-180")} />
            </button>
            {expanded ? (
              <p className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
