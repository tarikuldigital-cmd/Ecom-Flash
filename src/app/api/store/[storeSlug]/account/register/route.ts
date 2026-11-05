import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createCustomerSession } from "@/lib/storefront/customer-session";

export const runtime="nodejs";
const schema=z.object({storeSlug:z.string().min(1),name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),phone:z.string().trim().min(5).max(30),password:z.string().min(12).max(128)}).strict();
export async function POST(request:Request){
 let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:"Enter valid details. Password must be at least 12 characters."},{status:400});
 const d=parsed.data;const phone=d.phone.replace(/[\s()-]/g,"");
 try{
  const tenant=await prisma.tenant.findFirst({where:{slug:d.storeSlug,status:"ACTIVE",stores:{some:{slug:"main",status:"ACTIVE"}}},select:{id:true}});
  if(!tenant)return NextResponse.json({error:"Store not found."},{status:404});
  const exists=await prisma.customerAccount.findUnique({where:{tenantId_email:{tenantId:tenant.id,email:d.email}},select:{id:true}});
  if(exists)return NextResponse.json({error:"An account with this email already exists. Please sign in."},{status:409});
  const passwordHash=await hashPassword(d.password);
  const account=await prisma.$transaction(async tx=>{
   let customer=await tx.customer.findFirst({where:{tenantId:tenant.id,phone}});
   if(!customer)customer=await tx.customer.findFirst({where:{tenantId:tenant.id,email:d.email}});
   if(customer)customer=await tx.customer.update({where:{id:customer.id},data:{name:d.name,email:d.email,phone,address:customer.address, isArchived:false}});
   else customer=await tx.customer.create({data:{tenantId:tenant.id,name:d.name,email:d.email,phone}});
   return tx.customerAccount.create({data:{tenantId:tenant.id,customerId:customer.id,name:d.name,email:d.email,phone,passwordHash}});
  });
  await createCustomerSession(tenant.id,account.id);
  return NextResponse.json({account:{name:account.name,email:account.email},redirectTo:`/store/${d.storeSlug}/account`},{status:201});
 }catch(error){console.error("Customer registration failed:",error);return NextResponse.json({error:"Could not create your account right now."},{status:503})}
}
