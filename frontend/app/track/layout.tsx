import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Track the status of your BaselineKits order.",
  alternates: { canonical: "/track" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
