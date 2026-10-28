import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spaniel Grooming — Back office",
  robots: { index: false, follow: false },
};

export default function BackOfficeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
