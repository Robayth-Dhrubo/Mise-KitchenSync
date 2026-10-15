import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { PopupNavigation } from "@/components/PopupNavigation";

export const metadata: Metadata = {
  title: "Mise · KitchenSync",
  description: "Kitchen operations in sync: inventory, recipe costing, prep, purchasing, annual labour planning and menu launches.",
  keywords: ["restaurant", "service management", "recipe costing", "food cost", "inventory", "mise en place"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if (window.self !== window.top && new URLSearchParams(window.location.search).get('os_iframe') === 'true') document.documentElement.classList.add('is-iframe');`
          }}
        />
      </head>
      <body
        className="font-sans antialiased bg-background text-foreground overflow-auto"
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
