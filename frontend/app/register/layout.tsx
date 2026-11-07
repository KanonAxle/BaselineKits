import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a BaselineKits account to track orders and save your kit builds.",
  alternates: { canonical: "/register" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
