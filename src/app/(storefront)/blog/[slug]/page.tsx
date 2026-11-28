import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadBlogPost, loadBlogList } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadBlogPost(slug);
  if (!post) return { title: "مقاله یافت نشد" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, images: post.image ? [post.image] : undefined, type: "article", locale: "fa_IR" },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await loadBlogPost(slug);
  if (!post) notFound();
  const posts = await loadBlogList();
  return (
    <PageView
      view="blog"
      route={{ view: "blog", param: post.slug, query: {} }}
      data={{ user: null, categories: [], posts }}
    />
  );
}
