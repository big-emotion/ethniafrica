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
import { PRODUCT_NAME, OG_TITLE, OG_DESCRIPTION } from "@/lib/brand";

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
  metadataBase: new URL(
    (() => {
      const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      return url.startsWith("http") ? url : `http://${url}`;
    })()
  ),
  title: `${PRODUCT_NAME} | Dictionnaire des Ethnies d'Afrique`,
  description:
    "Encyclopédie des peuples, langues et familles linguistiques dans les 55 pays africains. Explorez la diversité culturelle et linguistique du continent.",
  authors: [{ name: PRODUCT_NAME }],
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
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
    <html
      lang="fr"
      className={`${inter.variable} ${playfairDisplay.variable} ${fraunces.variable} ${nunitoSans.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <TypeformPreload />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
