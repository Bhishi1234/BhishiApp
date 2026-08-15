import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bhishi — Group savings register",
  description:
    "A record-keeping app for Bhishi, Kameti, and Committee groups. Track contributions, run lucky draws, and send reminders. Money stays between members.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Bhishi",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#c45c26",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${notoSans.variable} ${notoDevanagari.className} min-h-dvh bg-background text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
