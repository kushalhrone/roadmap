import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HROne — Product Roadmap",
  description: "HROne Product Roadmap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=1440" />
      </head>
      <body>{children}</body>
    </html>
  );
}
