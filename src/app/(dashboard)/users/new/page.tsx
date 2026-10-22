import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  assignableLocations,
  assignableRoles,
  can,
} from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { NewUserForm } from "./new-user-form";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "users.write")) {
    return (
      <>
        <PageHeader title="New User" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access to create users.
        </Card>
      </>
    );
  }

  const roles = assignableRoles(session);
  const locations = assignableLocations(session);

  return (
    <>
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to users
      </Link>
      <PageHeader
        title="New User"
        description="Create a portal account and assign role + location."
      />
      <NewUserForm
        allowedRoles={roles}
        allowedLocations={locations}
        defaultLocation={
          session.role === "SUPER_ADMIN" ? "USA" : session.location
        }
      />
    </>
  );
}
