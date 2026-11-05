import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import StoreCartPage from "@/components/storefront/StoreCartPage";

export const dynamic = "force-dynamic";
export default async function CartPage({params}:{params:Promise<{storeSlug:string}>}){
 const {storeSlug}=await params;
 const store=await prisma.store.findFirst({where:{slug:"main",status:"ACTIVE",tenant:{slug:storeSlug,status:"ACTIVE"}},select:{name:true}});
 if(!store)notFound();
 return <StoreCartPage storeSlug={storeSlug} storeName={store.name}/>;
}
