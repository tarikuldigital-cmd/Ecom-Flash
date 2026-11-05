import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export const CUSTOMER_SESSION_COOKIE = "ecom_flash_customer_session";
const SESSION_DAYS = 30;
const hash = (token:string) => createHash("sha256").update(token).digest("hex");

export async function createCustomerSession(tenantId:string,accountId:string) {
 const token=randomBytes(32).toString("base64url");
 await prisma.customerAccountSession.create({data:{tenantId,accountId,tokenHash:hash(token),expiresAt:new Date(Date.now()+SESSION_DAYS*86400000)}});
 const store=await cookies();
 store.set(CUSTOMER_SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:SESSION_DAYS*86400});
}

export async function getCustomerSession(tenantId:string) {
 const store=await cookies();const token=store.get(CUSTOMER_SESSION_COOKIE)?.value;
 if(!token)return null;
 const session=await prisma.customerAccountSession.findUnique({where:{tokenHash:hash(token)},include:{account:{include:{customer:true}}}});
 if(!session||session.tenantId!==tenantId||session.expiresAt<=new Date()){
  if(session&&session.expiresAt<=new Date())await prisma.customerAccountSession.delete({where:{id:session.id}}).catch(()=>undefined);
  return null;
 }
 return session;
}

export async function clearCustomerSession(){
 const store=await cookies();const token=store.get(CUSTOMER_SESSION_COOKIE)?.value;
 if(token)await prisma.customerAccountSession.deleteMany({where:{tokenHash:hash(token)}});
 store.set(CUSTOMER_SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
}
