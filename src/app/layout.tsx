import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { PopupNavigation } from "@/components/PopupNavigation";

const manrope = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-primary",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mise - The Operating System for Profitable Service Operations",
  description: "Automate recipe costing, track inventory in real-time, and prevent profit loss due to ingredient price fluctuations.",
  keywords: ["restaurant", "service management", "recipe costing", "food cost", "inventory", "mise en place"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${manrope.variable} font-sans antialiased bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-auto`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <div className="min-h-screen bg-background">
            <PopupNavigation />
            {children}
          </div>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
