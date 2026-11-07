import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Survival Kits",
  description: "Browse pre-built survival kits for every scenario — from 72-hour go-bags to long-term family preparedness kits.",
  alternates: { canonical: "/kits" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
