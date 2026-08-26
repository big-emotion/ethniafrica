import type { Metadata } from "next";
import { connection } from "next/server";
import { headers } from "next/headers";
import { Fraunces, Nunito_Sans, JetBrains_Mono } from "next/font/google";
import "@/index.css";
import { Providers } from "./providers";
import { TypeformPreload } from "@/components/TypeformPreload";
import { PRODUCT_NAME, OG_TITLE, OG_DESCRIPTION } from "@/lib/brand";
import PlausibleScript from "@/components/PlausibleScript";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-nunito-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
});

// @req REQ-044
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

// @req REQ-115
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  // Set by the CSP middleware on the request headers. Providers hands it to
  // next-themes, whose inline bootstrap script script-src would otherwise
  // reject.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${nunitoSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <TypeformPreload />
        <Providers nonce={nonce}>
          {children}
          <PlausibleScript />
        </Providers>
      </body>
    </html>
  );
}
