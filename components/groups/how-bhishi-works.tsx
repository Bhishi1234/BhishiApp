"use client";

import { Card } from "@/components/ui/card";
import { useT } from "@/components/i18n/locale-provider";

export function HowBhishiWorks({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  const steps = [
    { title: t("howPayHapta"), body: t("howPayHaptaBody") },
    { title: t("howDraw"), body: t("howDrawBody") },
    { title: t("howWinner"), body: t("howWinnerBody") },
    { title: t("howEveryone"), body: t("howEveryoneBody") },
  ];

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {steps.map((step, index) => (
        <Card key={step.title} className="flex gap-3 p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
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
