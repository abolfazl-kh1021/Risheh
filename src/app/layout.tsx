import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { Toaster } from "@/components/ui/toaster";
import { WebVitals } from "@/app/web-vitals";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "فروشگاه صنایع دستی ریشه | Risheh Persian Crafts",
    template: "%s | ریشه",
  },
  description:
    "سامانه تخصصی عرضه مستقیم دست‌آفریده‌های نفیس استادکاران ایران با شناسنامه اصالت فیزیکی و ضمانت رسمی بدون واسطه.",
  keywords: [
    "صنایع دستی",
    "فرش دستباف",
    "میناکاری",
    "خاتم‌کاری",
    "ریشه",
    "هنر ایرانی",
  ],
  manifest: "/manifest.webmanifest",
  applicationName: "ریشه",
  appleWebApp: { capable: true, title: "ریشه", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/assets/img/logo-mark-64.png", sizes: "64x64", type: "image/png" },
      { url: "/assets/img/logo-mark-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/assets/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "ریشه | دست‌سازه‌های اصیل ایران",
    description:
      "خرید و فروش آثار هنری و صنایع دستی اصیل ایرانی به صورت مستقیم از برجسته‌ترین استادکاران و هنرمندان",
    locale: "fa_IR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f3d3a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {/* Preload the two Vazirmatn subsets actually used by fa/RTL UI (no FOUT). */}
        {preload("/assets/fonts/b37f9008d6c9.woff2", {
          as: "font",
          type: "font/woff2",
          crossOrigin: "anonymous",
        })}
        {preload("/assets/fonts/f50a38034db2.woff2", {
          as: "font",
          type: "font/woff2",
          crossOrigin: "anonymous",
        })}
        {children}
        <Toaster />
        <WebVitals />
      </body>
    </html>
  );
}
