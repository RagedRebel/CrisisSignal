import type { Metadata } from "next";
import "./globals.css";
import { CrisisProvider } from "@/store/useCrisisStore";

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
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased selection:bg-primary/30">
        <CrisisProvider>{children}</CrisisProvider>
      </body>
    </html>
  );
}
