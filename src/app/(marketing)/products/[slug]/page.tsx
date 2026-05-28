/* ============================================================
   /products/[slug] — eight Cantila X product pages from one
   dynamic route. Per-product copy lives in src/data/product-copy.tsx.
   The slug is the brand naming.md noun (host, deploy, data,
   domains, agents, automations, mail, sms).
   ============================================================ */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductSurface from "@/components/marketing/ProductSurface";
import JsonLd from "@/components/JsonLd";
import { PRODUCTS, PRODUCT_BY_SLUG } from "@/lib/site-meta";
import { PRODUCT_COPY } from "@/data/product-copy";
import {
  buildPageMetadata,
  productJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const product = PRODUCT_BY_SLUG[params.slug];
  if (!product) return { title: "Cantila" };
  return buildPageMetadata({
    title: `${product.name} — ${product.short}`,
    description: product.short,
    path: `/products/${product.slug}`,
    absolute: true,
  });
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = PRODUCT_BY_SLUG[params.slug];
  const copy = PRODUCT_COPY[params.slug];
  if (!product || !copy) notFound();
  const ld = productJsonLd(params.slug);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Cantila", path: "/" },
    { name: "Products", path: "/products/host" },
    { name: product.name, path: `/products/${product.slug}` },
  ]);
  return (
    <>
      <JsonLd payload={ld ? [ld, breadcrumb] : [breadcrumb]} />
      <ProductSurface
        product={product}
        hero={copy.hero}
        features={copy.features}
        details={copy.details}
        cta={copy.cta}
      />
    </>
  );
}
