import type { Metadata } from "next";
import { Geist, Vazirmatn } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  display: 'swap',
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
});

const persianFont = Vazirmatn({
  display: 'swap',
  variable: "--font-persian",
  subsets: ["arabic"],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your personal expenses",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${persianFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
