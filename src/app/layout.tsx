import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BottomNav } from "@/components/layout/bottom-nav";

const roboto = Roboto({ weight: "500", subsets: ["latin"], variable: "--font-roboto" });

export const metadata: Metadata = {
  title: "배드민턴 매칭",
  description: "누구나 자유롭게 배드민턴을 매칭해서 치는 문화",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={roboto.variable}>
      <body className="antialiased font-sans">
        <Providers>
          <div className="min-h-screen pb-16">
            {children}
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
