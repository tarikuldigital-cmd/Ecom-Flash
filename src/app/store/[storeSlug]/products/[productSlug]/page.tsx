import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import StoreCartButton, { StoreCartCount } from "@/components/storefront/StoreCart";

export const dynamic = "force-dynamic";

export default async function StoreProductPage({params}:{params:Promise<{storeSlug:string;productSlug:string}>}){
 const {storeSlug,productSlug}=await params;
 const tenant=await prisma.tenant.findFirst({where:{slug:storeSlug,status:"ACTIVE",stores:{some:{slug:"main",status:"ACTIVE"}}},include:{stores:{where:{slug:"main"},take:1}}});
 if(!tenant||!tenant.stores[0])notFound();
 const product=await prisma.product.findFirst({where:{tenantId:tenant.id,slug:productSlug,status:"ACTIVE",stockQuantity:{gt:0}},include:{category:{select:{name:true}}}});
 if(!product)notFound();
 const money=(v:unknown)=>new Intl.NumberFormat("en-BD",{style:"currency",currency:"BDT",maximumFractionDigits:0}).format(Number(v));
 return <main className="public-storefront" style={{"--store-brand":tenant.stores[0].primaryColor} as React.CSSProperties}>
  <header className="public-store-header"><Link href={`/store/${storeSlug}`} className="public-store-brand">{tenant.stores[0].name}</Link><nav><Link href={`/store/${storeSlug}`}>Home</Link><StoreCartCount storeSlug={storeSlug}/></nav></header>
  <div className="store-product-detail"><div className="store-product-gallery">{product.images[0]?<img src={product.images[0]} alt={product.name}/>:<div className="public-product-placeholder">{product.name.slice(0,1)}</div>}</div><div className="store-product-copy"><Link href={`/store/${storeSlug}`} className="store-back-link">← Back to store</Link>{product.category&&<small>{product.category.name}</small>}<h1>{product.name}</h1><div className="store-product-price"><strong>{money(product.price)}</strong>{product.compareAtPrice&&Number(product.compareAtPrice)>Number(product.price)&&<del>{money(product.compareAtPrice)}</del>}</div><p>{product.description||"A carefully selected product from our store."}</p><span className="store-stock-label">In stock · {product.stockQuantity} available</span><StoreCartButton storeSlug={storeSlug} product={{productId:product.id,name:product.name,price:Number(product.price),image:product.images[0]||null}}/><p className="store-cod-note">Cash on Delivery available. Shipping charges, if applicable, will be confirmed by the store.</p></div></div>
  <footer className="public-store-footer"><strong>{tenant.stores[0].name}</strong><small>© {new Date().getFullYear()} {tenant.stores[0].name}</small></footer>
 </main>;
}
