import { OpportunityDetail } from "@/components/OpportunityDetail";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OpportunityDetail id={Number((await params).id)} />;
}
