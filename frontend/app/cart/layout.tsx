import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "Review your cart and checkout securely with Stripe.",
  alternates: { canonical: "/cart" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
