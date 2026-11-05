import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/prisma";
import {checkTenantAccess} from "@/lib/auth/tenant-access";
export const runtime="nodejs";
export async function GET(request:Request){const tenantId=new URL(request.url).searchParams.get("tenantId")||"";if(!tenantId)return NextResponse.json({error:"tenantId is required."},{status:400});const access=await checkTenantAccess(tenantId,"orders.read");if(!access.ok)return NextResponse.json({error:"Not authorized."},{status:access.reason==="UNAUTHENTICATED"?401:403});const carts=await prisma.abandonedCart.findMany({where:{tenantId},orderBy:{lastActivityAt:"desc"},take:100,select:{id:true,customerName:true,phone:true,email:true,items:true,subtotal:true,status:true,consentToRecovery:true,lastActivityAt:true,createdAt:true}});return NextResponse.json({carts})}
