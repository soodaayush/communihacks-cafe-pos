import type { Metadata, Viewport } from "next";
import { NavBar } from "@/components/nav/NavBar";
import "./globals.css";

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
      <body className="flex min-h-dvh flex-col">
        <main className="flex-1 p-6">{children}</main>
        <NavBar />
      </body>
    </html>
  );
}
