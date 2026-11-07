import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Education Hub — Emergency Preparedness Guides",
  description: "Guides and articles on emergency preparedness, survival skills, and building the right kit for your situation.",
  alternates: { canonical: "/education" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
