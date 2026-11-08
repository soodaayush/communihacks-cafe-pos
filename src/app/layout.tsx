import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { NavBar } from "@/components/nav/NavBar";
import { SoundProvider } from "@/components/nav/SoundProvider";
import "./globals.css";

// Made by the Braille Institute for low-vision readers: letters that are hard to mix up.
const font = Atkinson_Hyperlegible_Next({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KW Habilitation Café",
  description: "Picture-based café register that teaches how money works.",
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#faf6ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${font.className} flex h-dvh flex-col`}>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        <NavBar />
        <SoundProvider />
      </body>
    </html>
  );
}
