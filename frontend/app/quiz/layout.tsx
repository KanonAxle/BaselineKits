import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build My Kit — Survival Kit Assessment",
  description: "Answer a few questions about your use case, duration, and environment and get a custom survival kit recommendation.",
  alternates: { canonical: "/quiz" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
