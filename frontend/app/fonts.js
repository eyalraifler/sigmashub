import { Geist, Geist_Mono, Dancing_Script, League_Spartan } from "next/font/google";

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

