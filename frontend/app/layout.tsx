import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../lib/cartContext";
import { Analytics } from '@vercel/analytics/next';

const barlow = Barlow({
  weight: ['400', '500', '600'],
  variable: "--font-barlow",
  subsets: ["latin"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ['600', '700', '800'],
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.baselinekits.com"),
  title: {
    default: "BaselineKits — Custom Survival Kits, Built for You",
    template: "%s — BaselineKits",
  },
  description:
    "Answer a few questions and get a custom survival kit packed and shipped to your door. Quality sourced brands, hand-packed and verified.",
  keywords: [
    "survival kit",
    "custom survival kit",
    "emergency preparedness",
    "emergency kit",
    "bug out bag",
    "disaster preparedness",
    "72 hour kit",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "BaselineKits",
    title: "BaselineKits — Custom Survival Kits, Built for You",
    description:
      "Answer a few questions and get a custom survival kit packed and shipped to your door.",
    url: "/",
    images: [
      {
        url: "/og-banner.jpg",
        width: 1200,
        height: 630,
        alt: "BaselineKits — custom survival kits, hand-packed and shipped to your door",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BaselineKits — Custom Survival Kits, Built for You",
    description:
      "Answer a few questions and get a custom survival kit packed and shipped to your door.",
    images: ["/og-banner.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${barlow.variable} ${barlowCondensed.variable} antialiased`} suppressHydrationWarning>
        <CartProvider>{children}</CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
