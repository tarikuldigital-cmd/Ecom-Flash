import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function PublicStorefrontPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const tenant = await prisma.tenant.findFirst({
    where: { slug: storeSlug, status: "ACTIVE", stores: { some: { slug: "main", status: "ACTIVE" } } },
    include: {
      stores: { where: { slug: "main", status: "ACTIVE" }, take: 1 },
      products: { where: { status: "ACTIVE", stockQuantity: { gt: 0 } }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, name: true, slug: true, description: true, price: true, compareAtPrice: true, images: true, category: { select: { name: true } } } },
    },
  });
  if (!tenant || !tenant.stores[0]) notFound();
  const store = tenant.stores[0];
  const money = (amount: unknown) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(Number(amount));
  return <main className="public-storefront" style={{ "--store-brand": store.primaryColor } as React.CSSProperties}>
    {store.announcement && <div className="public-store-announcement">{store.announcement}</div>}
    <header className="public-store-header"><a href={`/store/${tenant.slug}`} className="public-store-brand">{store.logoUrl ? <img src={store.logoUrl} alt={store.name}/> : <strong>{store.name}</strong>}</a><nav><a href="#home">Home</a><a href="#products">Shop</a><a href="#about">About</a><a href="#contact">Contact</a></nav></header>
    <section id="home" className="public-store-hero" style={store.bannerUrl ? { backgroundImage: `linear-gradient(90deg,rgba(8,20,13,.72),rgba(8,20,13,.12)),url("${store.bannerUrl}")` } : undefined}><div><span>WELCOME TO OUR STORE</span><h1>{store.name}</h1><p>{store.tagline || store.description || "Discover products selected for you."}</p><a href="#products">Explore collection</a></div></section>
    <section id="products" className="public-store-products"><div className="public-store-section-heading"><div><span>CURATED FOR YOU</span><h2>Our products</h2></div><p>Thoughtfully selected products, ready to order.</p></div>
      {tenant.products.length ? <div className="public-product-grid">{tenant.products.map(product=><article key={product.id} className="public-product-card"><div className="public-product-image">{product.images[0]?<img src={product.images[0]} alt={product.name}/>:<div className="public-product-placeholder">{store.name.slice(0,1).toUpperCase()}</div>}</div><div className="public-product-info">{product.category?.name&&<small>{product.category.name}</small>}<h3>{product.name}</h3>{product.description&&<p>{product.description}</p>}<div><strong>{money(product.price)}</strong>{product.compareAtPrice&&Number(product.compareAtPrice)>Number(product.price)&&<del>{money(product.compareAtPrice)}</del>}</div></div></article>)}</div> : <div className="public-store-empty"><h3>Our collection is coming soon</h3><p>We are preparing products for this store. Please check back shortly.</p></div>}
    </section>
    <section id="about" className="public-store-about"><span>OUR STORY</span><h2>{store.tagline || "A store built around what matters."}</h2><p>{store.description || "We believe great shopping should feel simple, clear and personal."}</p></section>
    <footer id="contact" className="public-store-footer"><div><strong>{store.name}</strong><p>{store.description || "Thank you for visiting our store."}</p></div><div><span>Contact</span>{store.contactPhone&&<p>{store.contactPhone}</p>}{store.contactEmail&&<p>{store.contactEmail}</p>}</div><small>© {new Date().getFullYear()} {store.name}. All rights reserved.</small></footer>
  </main>;
}
