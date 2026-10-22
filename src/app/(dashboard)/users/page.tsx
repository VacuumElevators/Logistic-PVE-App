import Link from "next/link";
import { redirect } from "next/navigation";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import {
  can,
  canManageUser,
  roleLabel,
  assignableRoles,
  assignableLocations,
} from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewUserButton } from "@/components/users/new-user-button";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  EmptyRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { UserFilterBar } from "@/components/users/user-filter-bar";
import { UserRowActions } from "@/components/users/user-row-actions";
import { formatDateTime, locationLabel } from "@/lib/utils";
import type { Database } from "@/types/database";
import { LOCATIONS } from "@/lib/constants";
import { ROLES } from "@/lib/permissions";

type UserRole = Database["public"]["Enums"]["UserRole"];
type UserStatus = Database["public"]["Enums"]["UserStatus"];

export const dynamic = "force-dynamic";

type Location = Database["public"]["Enums"]["Location"];

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  locationId: Location;
  status: UserStatus;
  lastLoginAt: string | null;
}

const ROLE_COLOR: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-brand-50 text-brand-700",
  LOCATION_ADMIN: "bg-violet-50 text-violet-700",
  MANAGER: "bg-sky-50 text-sky-700",
  STAFF: "bg-slate-100 text-slate-700",
  VIEWER: "bg-amber-50 text-amber-700",
};

const STATUS_COLOR: Record<UserStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  SUSPENDED: "bg-rose-50 text-rose-700",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    role?: string;
    location?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "users.read")) {
    return (
      <>
        <PageHeader title="Users" />
        <Card className="p-10 text-center text-sm text-slate-500">
          You don't have access to user management.
        </Card>
      </>
    );
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 20;
  const client = sb();

  let q = client
    .from("User")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false });
  if (session.role !== "SUPER_ADMIN") {
    q = q.eq("locationId", session.location);
  } else if (sp.location && (LOCATIONS as readonly string[]).includes(sp.location)) {
    q = q.eq("locationId", sp.location as (typeof LOCATIONS)[number]);
  }
  if (sp.role && (ROLES as readonly string[]).includes(sp.role)) {
    q = q.eq("role", sp.role as UserRole);
  }
  if (sp.status && ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(sp.status)) {
    q = q.eq("status", sp.status as UserStatus);
  }
  if (sp.search) {
    q = q.or(`name.ilike.%${sp.search}%,email.ilike.%${sp.search}%`);
  }

  const skip = (page - 1) * pageSize;
  const { data: usersData, count, error } = await q.range(skip, skip + pageSize - 1);
  if (error) throw error;
  const users = (usersData ?? []) as unknown as UserRow[];
  const total = count ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canWrite = can(session, "users.write");

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description={
          session.role === "SUPER_ADMIN"
            ? "Manage every PVE user across all locations."
            : `Manage users in ${locationLabel(session.location)}.`
        }
        actions={
          canWrite ? (
            <NewUserButton
              allowedRoles={assignableRoles(session)}
              allowedLocations={assignableLocations(session)}
              defaultLocation={
                session.role === "SUPER_ADMIN" ? "USA" : session.location
              }
            />
          ) : undefined
        }
      />

      <UserFilterBar
        canFilterLocation={session.role === "SUPER_ADMIN"}
        scopedLocation={
          session.role === "SUPER_ADMIN" ? undefined : session.location
        }
      />

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH>Location</TH>
              <TH>Last login</TH>
              <TH>Status</TH>
              <TH className="text-right pr-4">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {users.length === 0 && (
              <EmptyRow colSpan={7} message="No users match these filters." />
            )}
            {users.map((u) => {
              const allowed = canManageUser(session, {
                role: u.role,
                locationId: u.locationId,
                id: u.id,
              });
              return (
                <TR key={u.id}>
                  <TD className="font-medium text-slate-900">
                    {canWrite && allowed ? (
                      <Link
                        href={`/users/${u.id}`}
                        className="hover:text-brand-600"
                      >
                        {u.name}
                      </Link>
                    ) : (
                      u.name
                    )}
                  </TD>
                  <TD className="text-slate-600">{u.email}</TD>
                  <TD>
                    <Badge className={ROLE_COLOR[u.role]}>
                      {roleLabel(u.role)}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-slate-500">
                    {locationLabel(u.locationId)}
                  </TD>
                  <TD className="text-xs text-slate-500">
                    {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}
                  </TD>
                  <TD>
                    <Badge className={STATUS_COLOR[u.status]}>{u.status}</Badge>
                  </TD>
                  <TD className="text-right pr-4">
                    <UserRowActions
                      user={{ id: u.id, name: u.name, status: u.status }}
                      isSelf={u.id === session.sub}
                      canManage={allowed}
                    />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
        />
      </Card>
    </>
  );
}
