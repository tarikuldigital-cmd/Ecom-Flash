import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCustomerSession,clearCustomerSession } from "@/lib/storefront/customer-session";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{storeSlug:string}>}){
 const {storeSlug}=await params;
 try{
  const tenant=await prisma.tenant.findFirst({where:{slug:storeSlug,status:"ACTIVE"},select:{id:true,name:true}});
  if(!tenant)return NextResponse.json({error:"Store not found."},{status:404});
  const session=await getCustomerSession(tenant.id);
  if(!session)return NextResponse.json({authenticated:false});
  const customerId=session.account.customerId;
  const orders=customerId?await prisma.order.findMany({where:{tenantId:tenant.id,customerId},select:{id:true,orderNumber:true,status:true,paymentStatus:true,total:true,createdAt:true,items:{select:{productName:true,quantity:true,lineTotal:true}}},orderBy:{createdAt:"desc"},take:50}):[];
  return NextResponse.json({authenticated:true,account:{name:session.account.name,email:session.account.email,phone:session.account.phone},orders:orders.map(o=>({...o,total:Number(o.total),items:o.items.map(i=>({...i,lineTotal:Number(i.lineTotal)})),trackingTokenHash:undefined}))},{headers:{"Cache-Control":"no-store, private"}});
 }catch(error){console.error("Customer account load failed:",error);return NextResponse.json({error:"Account details unavailable."},{status:503})}
}
export async function POST(){
 try{await clearCustomerSession();return NextResponse.json({success:true})}catch{return NextResponse.json({error:"Could not sign out."},{status:503})}
}
