import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your BaselineKits account, orders, and saved kits.",
  alternates: { canonical: "/account" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
