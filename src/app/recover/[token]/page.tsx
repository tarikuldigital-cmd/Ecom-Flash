import RecoverCart from "@/components/abandoned-carts/RecoverCart";
export const dynamic="force-dynamic";
export default async function RecoverPage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <RecoverCart token={token}/>}
