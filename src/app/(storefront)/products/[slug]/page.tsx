import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadProduct, loadCatalog } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "اثر یافت نشد" };
  const img = product.images[0];
  return {
    title: product.title,
    description: product.description.slice(0, 160),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.title} — ریشه`,
      description: product.description.slice(0, 160),
      images: img ? [img] : undefined,
      type: "website",
      locale: "fa_IR",
    },
  };
}

/** صفحه محصول (M1/M2) — URL مستقل، متادیتا، JSON-LD و آثار مرتبط. */
export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const related = await loadCatalog({ category: product.categorySlug, pageSize: 8 });
  const artworks = [product, ...related.artworks.filter((a) => a.id !== product.id)];

  // JSON-LD product schema (SEO, Phase 4). `</script>`-breakout is prevented by
  // escaping `<` — the ONLY dangerouslySetInnerHTML in the app, with sanitized
  // server-generated JSON (documented in DECISIONS.md D-SEO).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    sku: product.code,
    image: product.images,
    brand: { "@type": "Brand", name: "ریشه — دست‌سازه‌های اصیل ایران" },
    manufacturer: { "@type": "Person", name: product.seller.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `/products/${product.slug}`,
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <PageView
        view="product"
        route={{ view: "product", param: product.id, query: {} }}
        data={{
          user: null,
          categories: [],
          artworks,
        }}
      />
    </>
  );
}
