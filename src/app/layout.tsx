import type { Metadata } from "next";
import {
  Inter,
  Playfair_Display,
  Fraunces,
  Nunito_Sans,
} from "next/font/google";
import "@/index.css";
import { Providers } from "./providers";
import { TypeformPreload } from "@/components/TypeformPreload";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-playfair",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "700", "900"],
  variable: "--font-fraunces",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-nunito-sans",
});

export const metadata: Metadata = {
  title: "African Ethnicities Dictionary | Dictionnaire des Ethnies d'Afrique",
  description:
    "Comprehensive multilingual encyclopedia of African ethnic groups across all 55 countries. Explore demographics, cultures, and languages.",
  authors: [{ name: "African Ethnicities Dictionary" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "African Ethnicities Dictionary",
    description:
      "Comprehensive multilingual encyclopedia of African ethnic groups",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@big_emotion",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfairDisplay.variable} ${fraunces.variable} ${nunitoSans.variable} font-sans antialiased`}
      >
        <TypeformPreload />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
