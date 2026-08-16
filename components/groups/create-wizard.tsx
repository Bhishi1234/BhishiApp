"use client";

import { useState } from "react";
import { createGroupAction } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatRupees } from "@/lib/format";
import { firstDrawDate, localISODate } from "@/lib/dates";
import type { CycleFrequency, GroupType } from "@/lib/types";
import { cn } from "@/lib/utils";

const types: {
  id: GroupType;
  title: string;
  hindi: string;
  description: string;
  disabled?: boolean;
}[] = [
  {
    id: "lucky_draw",
    title: "Lucky Draw",
    hindi: "चिठ्ठी भिशी",
    description: "On meeting day, one chitthi is drawn. That person takes the pool. Past winners stay out.",
  },
  {
    id: "bidding",
    title: "Bidding",
    hindi: "लिलाव भिशी",
    description: "Members bid a discount during an open window. Lowest bid wins. The rest is split equally among other hands.",
  },
  {
    id: "loan",
    title: "Loan",
    hindi: "कर्ज भिशी",
    description: "Coming later — interest tracking needs a legal review.",
    disabled: true,
  },
];

export function CreateWizard() {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<GroupType>("lucky_draw");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [memberCount, setMemberCount] = useState("10");
  const [frequency, setFrequency] = useState<CycleFrequency>("monthly");
  const [startDate, setStartDate] = useState(localISODate());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const amountNumber = Number(amount);
  const countNumber = Number(memberCount);

  async function finish() {
    setPending(true);
    setError(null);
    const result = await createGroupAction({
      name,
      type,
      amount: amountNumber,
      memberCount: countNumber,
      frequency,
      startDate,
    });
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Step {step} of 4</p>
        <Progress value={step * 25} className="mt-2" />
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">How will this Bhishi run?</h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Informal groups usually pick a name from a box each month. Bidding (lilav) is the other common style.
          </p>
          {types.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => setType(item.id)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition",
                item.disabled && "opacity-50",
                type === item.id && !item.disabled
                  ? "border-primary bg-card shadow-sm"
                  : "border-border bg-card/70",
              )}
            >
              <p className="font-semibold">
                {item.title}{" "}
                <span className="text-muted-foreground">· {item.hindi}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">Name this group</h1>
          <Label htmlFor="name">Group name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Diwali Bhishi 2026"
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">What is the monthly hapta?</h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Every member pays this amount each month, including people who have already received the pool.
          </p>
          <Label htmlFor="amount">Hapta amount</Label>
          <div className="relative">
            <span className="absolute top-1/2 left-4 -translate-y-1/2 font-semibold">₹</span>
            <Input
              id="amount"
              inputMode="numeric"
              className="pl-8"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="2000"
            />
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Members and meeting day</h1>
          <div className="space-y-2">
            <Label htmlFor="count">How many hands?</Label>
            <Input
              id="count"
              inputMode="numeric"
              value={memberCount}
              onChange={(event) => setMemberCount(event.target.value.replace(/\D/g, ""))}
            />
            <p className="text-sm text-muted-foreground">
              Hands equal months. {countNumber || 10} hands means {countNumber || 10} meetings.
              One person can take two hands if they want to play a larger share.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">Group start date</Label>
            <Input
              id="start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              First chitthi:{" "}
              <strong className="text-foreground">
                {formatDate(firstDrawDate(startDate, frequency))}
              </strong>
              . That is one {frequency === "weekly" ? "week" : "month"} after this date.
            </p>
          </div>
          <div className="space-y-2">
            <Label>How often do you meet?</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["monthly", "weekly"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFrequency(item)}
                  className={cn(
                    "h-12 rounded-xl border font-semibold capitalize",
                    frequency === item
                      ? "border-primary bg-card"
                      : "border-border bg-muted",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {amountNumber > 0 && countNumber > 0 ? (
            <Card className="p-4 text-sm">
              Monthly pool:{" "}
              <strong>{formatRupees(amountNumber * countNumber)}</strong> when
              all {countNumber} hands are filled. Someone can hold more than one hand.
            </Card>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="flex gap-3">
        {step > 1 ? (
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : null}
        {step < 4 ? (
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              if (step === 2 && name.trim().length < 2) {
                setError("Please enter a group name.");
                return;
              }
              if (step === 3 && !(amountNumber > 0)) {
                setError("Please enter the cycle amount.");
                return;
              }
              setError(null);
              setStep(step + 1);
            }}
          >
            Continue
          </Button>
        ) : (
          <Button type="button" className="flex-1" disabled={pending} onClick={finish}>
            {pending ? "Creating…" : "Create group"}
          </Button>
        )}
      </div>
    </div>
  );
}
