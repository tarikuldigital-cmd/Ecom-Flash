import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createCustomerSession } from "@/lib/storefront/customer-session";
export const runtime="nodejs";
const schema=z.object({storeSlug:z.string().min(1),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(1).max(128)}).strict();
export async function POST(request:Request){
 let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:"Invalid email or password."},{status:400});
 try{
  const tenant=await prisma.tenant.findFirst({where:{slug:parsed.data.storeSlug,status:"ACTIVE",stores:{some:{slug:"main",status:"ACTIVE"}}},select:{id:true}});
  if(!tenant)return NextResponse.json({error:"Store not found."},{status:404});
  const account=await prisma.customerAccount.findUnique({where:{tenantId_email:{tenantId:tenant.id,email:parsed.data.email}}});
  if(!account||!(await verifyPassword(parsed.data.password,account.passwordHash)))return NextResponse.json({error:"Invalid email or password."},{status:401});
  await createCustomerSession(tenant.id,account.id);
  return NextResponse.json({redirectTo:`/store/${parsed.data.storeSlug}/account`});
 }catch(error){console.error("Customer login failed:",error);return NextResponse.json({error:"Sign in is temporarily unavailable."},{status:503})}
}
