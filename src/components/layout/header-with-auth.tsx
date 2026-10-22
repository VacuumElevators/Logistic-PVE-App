import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AuthBootstrap } from "@/components/auth-bootstrap";
import { getCurrentUser } from "@/lib/auth";
import { roleLabel } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import type { LocationKey } from "@/lib/constants";

export async function HeaderWithAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleLabel: roleLabel(user.role),
    locationId: user.locationId,
    status: user.status,
  };

  return (
    <>
      <AuthBootstrap user={authUser} />
      <Header
        user={{
          name: user.name,
          email: user.email,
          roleLabel: roleLabel(user.role),
          location: user.locationId as LocationKey,
        }}
      />
    </>
  );
}

export function HeaderSkeleton() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6">
      <Skeleton className="h-9 w-64" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
    </header>
  );
}
