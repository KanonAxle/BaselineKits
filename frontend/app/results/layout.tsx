import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Custom Kit Recommendation",
  description: "Your personalized survival kit recommendation based on your assessment answers.",
  alternates: { canonical: "/results" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
