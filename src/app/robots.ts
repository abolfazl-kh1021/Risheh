import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://risheh-store.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/account", "/orders", "/cart", "/api/", "/pay/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
