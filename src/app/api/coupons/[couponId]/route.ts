import {NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/db/prisma";
import {checkTenantAccess} from "@/lib/auth/tenant-access";
export const runtime="nodejs";
const schema=z.object({isActive:z.boolean()}).strict();
export async function PATCH(request:Request,{params}:{params:Promise<{couponId:string}>}){const {couponId}=await params;let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:"Invalid update."},{status:400})}const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:"Invalid update."},{status:400});const coupon=await prisma.coupon.findUnique({where:{id:couponId},select:{tenantId:true}});if(!coupon)return NextResponse.json({error:"Coupon not found."},{status:404});const access=await checkTenantAccess(coupon.tenantId,"orders.write");if(!access.ok)return NextResponse.json({error:"You do not have permission."},{status:403});const updated=await prisma.coupon.update({where:{id:couponId},data:{isActive:parsed.data.isActive}});await prisma.auditLog.create({data:{tenantId:coupon.tenantId,actorId:access.userId,action:"coupon.status_changed",entityType:"Coupon",entityId:couponId,metadata:{isActive:updated.isActive}}});return NextResponse.json({coupon:updated});}
