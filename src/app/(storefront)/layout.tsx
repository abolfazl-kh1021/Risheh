import type { Metadata } from "next";
import { loadShellData } from "@/lib/data";
import { ShellProvider, ShellChrome } from "@/risheh/shell";

/**
 * Storefront layout — the shell chrome (header/tab bar/footer + demo banner)
 * wraps every real route. Data is loaded per page; the shell only carries the
 * small shared slice (user, cart count, categories, unread notifications).
 */
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const shell = await loadShellData();
  return (
    <ShellProvider shell={shell}>
      <ShellChrome>{children}</ShellChrome>
    </ShellProvider>
  );
}

export const metadata: Metadata = {
  title: { default: "فروشگاه صنایع دستی ریشه | Risheh Persian Crafts", template: "%s | ریشه" },
};
