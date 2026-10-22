import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import {
  assignableLocations,
  assignableRoles,
  can,
  canManageUser,
  roleLabel,
} from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { EditUserForm } from "./edit-user-form";
import { DangerActions } from "./danger-actions";

export const dynamic = "force-dynamic";

const STATUS_COLOR = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  SUSPENDED: "bg-rose-50 text-rose-700",
} as const;

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "users.read")) {
    return (
      <Card className="p-10 text-center text-sm text-slate-500">
        You don't have access.
      </Card>
    );
  }

  const { id } = await params;
  const { data: user, error } = await sb()
    .from("User")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!user) notFound();

  if (
    session.role !== "SUPER_ADMIN" &&
    user.locationId !== session.location
  ) {
    return (
      <Card className="p-10 text-center text-sm text-slate-500">
        User not found.
      </Card>
    );
  }

  const isSelf = session.sub === user.id;
  const canEdit = canManageUser(session, user);
  const allowedRoles = assignableRoles(session);
  const allowedLocations = assignableLocations(session);

  return (
    <>
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" /> Back to users
      </Link>
      <PageHeader
        title={user.name}
        description={`${roleLabel(user.role)} · ${user.email}`}
        actions={<Badge className={STATUS_COLOR[user.status]}>{user.status}</Badge>}
      />

      <EditUserForm
        userId={user.id}
        canEdit={canEdit}
        lockPrivilegedFields={isSelf}
        initial={{
          name: user.name,
          email: user.email,
          role: user.role,
          locationId: user.locationId,
          status: user.status,
        }}
        allowedRoles={allowedRoles}
        allowedLocations={allowedLocations}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account metadata</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6 space-y-2 text-sm">
            <Row label="User ID" value={user.id} mono />
            <Row label="Created" value={formatDateTime(user.createdAt)} />
            <Row
              label="Last login"
              value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
            />
          </div>
        </Card>

        {canEdit && !isSelf && (
          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <DangerActions userId={user.id} userName={user.name} status={user.status} />
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between border-b border-slate-100 last:border-0 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-medium text-slate-900 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
