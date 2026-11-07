import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Survival Gear & Products",
  description: "Shop individual emergency preparedness products: water filtration, emergency food, medical supplies, tools, lighting, and shelter.",
  alternates: { canonical: "/products" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
