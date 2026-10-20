import type { Metadata } from "next";
import "./globals.css";
import { CrisisProvider } from "@/store/useCrisisStore";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "CrisisSignal Priority Engine | Emergency Response Coordination",
  description: "Decision-support priority queue and silence layer for flood disaster control rooms.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased selection:bg-primary/30">
        <CrisisProvider>
          <div className="flex h-dvh flex-col overflow-hidden">
            <Navbar />
            <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
          </div>
        </CrisisProvider>
      </body>
    </html>
  );
}
