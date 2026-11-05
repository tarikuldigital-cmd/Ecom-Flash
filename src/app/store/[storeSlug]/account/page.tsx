import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { CustomerAccount } from "@/components/storefront/CustomerAccount";
export const dynamic="force-dynamic";
export default async function CustomerAccountPage({params}:{params:Promise<{storeSlug:string}>}){
 const {storeSlug}=await params;
 const store=await prisma.store.findFirst({where:{slug:"main",status:"ACTIVE",tenant:{slug:storeSlug,status:"ACTIVE"}},select:{name:true}});
 if(!store)notFound();
 return <CustomerAccount storeSlug={storeSlug} storeName={store.name}/>;
}
