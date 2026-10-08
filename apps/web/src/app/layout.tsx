import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "English Battle — Multiplayer Word Guessing Game",
  description: "Web game realtime đoán từ tiếng Anh qua nghĩa tiếng Việt với cơ chế mở ký tự ngẫu nhiên độc đáo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} dark`}>
      <body className="antialiased min-h-screen bg-[#11100e] text-stone-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
