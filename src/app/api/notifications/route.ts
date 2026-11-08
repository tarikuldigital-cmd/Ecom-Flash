import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/prisma";
import {checkTenantAccess} from "@/lib/auth/tenant-access";
export const runtime="nodejs";
export async function GET(request:Request){const tenantId=new URL(request.url).searchParams.get("tenantId")||"";if(!tenantId)return NextResponse.json({error:"tenantId is required."},{status:400});const access=await checkTenantAccess(tenantId,"orders.read");if(!access.ok)return NextResponse.json({error:"Not authorized."},{status:access.reason==="UNAUTHENTICATED"?401:403});const [notifications,unreadCount]=await Promise.all([prisma.notification.findMany({where:{tenantId},orderBy:{createdAt:"desc"},take:100}),prisma.notification.count({where:{tenantId,readAt:null}})]);return NextResponse.json({notifications,unreadCount})}
