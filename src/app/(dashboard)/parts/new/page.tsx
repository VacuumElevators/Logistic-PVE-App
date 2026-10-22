import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PartForm } from "@/components/parts/part-form";

export const dynamic = "force-dynamic";

export default async function NewPartPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "parts.write")) {
    return (
      <>
        <PageHeader title="New Part" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access to add parts.
        </Card>
      </>
    );
  }

  const { data: suppliers, error } = await sb()
    .from("Supplier")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw error;

  return (
    <>
      <Link
        href="/parts"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to parts
      </Link>
      <PageHeader
        title="Add a Part"
        description="Add a replacement part to the global catalog."
      />
      <PartForm mode="create" suppliers={suppliers ?? []} />
    </>
  );
}
