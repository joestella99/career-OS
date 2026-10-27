import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerOS | Discover Jobs You Can Actually Win",
  description: "A free evidence-ranked NYC software, solutions and product job search engine. Real jobs, honest fit explanations, no paid APIs.",
  robots: { index: false, follow: false },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
