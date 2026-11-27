import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gold and silver prices",
  description: "Indian gold and silver benchmark prices including GST.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
