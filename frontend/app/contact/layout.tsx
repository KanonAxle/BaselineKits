import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Questions about your order or building a custom kit? Get in touch with the BaselineKits team.",
  alternates: { canonical: "/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
