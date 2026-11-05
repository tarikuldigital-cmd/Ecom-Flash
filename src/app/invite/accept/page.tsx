import AcceptInvitation from "@/components/team/AcceptInvitation";

export const metadata = { title: "Accept team invitation" };

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <AcceptInvitation token={params.token || ""} />;
}
