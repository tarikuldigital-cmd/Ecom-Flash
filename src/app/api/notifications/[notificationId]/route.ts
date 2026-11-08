import {NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/db/prisma";
import {checkTenantAccess} from "@/lib/auth/tenant-access";
export const runtime="nodejs";
const schema=z.object({tenantId:z.string().min(1),read:z.boolean()}).strict();
export async function PATCH(request:Request,{params}:{params:Promise<{notificationId:string}>}){const {notificationId}=await params;let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:"Invalid notification update."},{status:400});const access=await checkTenantAccess(parsed.data.tenantId,"orders.read");if(!access.ok)return NextResponse.json({error:"Not authorized."},{status:access.reason==="UNAUTHENTICATED"?401:403});const result=await prisma.notification.updateMany({where:{id:notificationId,tenantId:parsed.data.tenantId},data:{readAt:parsed.data.read?new Date():null}});if(!result.count)return NextResponse.json({error:"Notification not found."},{status:404});return NextResponse.json({updated:true})}
