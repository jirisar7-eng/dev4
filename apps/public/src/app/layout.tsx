import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEV4 | Synthesis",
  description: "DEV4 Technical Placeholder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className="antialiased bg-gray-50 text-gray-900 min-h-screen flex flex-col justify-center items-center">
        {children}
      </body>
    </html>
  );
}
