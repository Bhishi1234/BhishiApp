"use client";

import { Toaster } from "sonner";
import { LocaleProvider } from "@/components/i18n/locale-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale="en">
      {children}
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          className: "font-sans",
        }}
      />
    </LocaleProvider>
  );
}
