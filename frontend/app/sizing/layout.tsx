import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sizing Guide",
  description: "Find the right sizes for apparel and gear in your survival kit.",
  alternates: { canonical: "/sizing" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
