"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { UserForm, type UserFormValues } from "@/components/users/user-form";
import { apiFetch } from "@/lib/api-fetch";
import type { Database } from "@/types/database";

type Location = Database["public"]["Enums"]["Location"];
type UserRole = Database["public"]["Enums"]["UserRole"];
type UserStatus = Database["public"]["Enums"]["UserStatus"];

interface Props {
  userId: string;
  canEdit: boolean;
  lockPrivilegedFields: boolean;
  initial: {
    name: string;
    email: string;
    role: UserRole;
    locationId: Location;
    status: UserStatus;
  };
  allowedRoles: UserRole[];
  allowedLocations: Location[];
}

export function EditUserForm({
  userId,
  canEdit,
  lockPrivilegedFields,
  initial,
  allowedRoles,
  allowedLocations,
}: Props) {
  const router = useRouter();

  if (!canEdit) {
    return (
      <Card className="p-6 text-sm text-slate-500">
        You can view this user but cannot make changes.
      </Card>
    );
  }

  async function onSubmit(values: UserFormValues): Promise<string | null> {
    const payload: Partial<UserFormValues> = { ...values };
    if (!payload.password) delete payload.password;
    const res = await apiFetch(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return json?.error ?? "Failed to update user.";
    router.refresh();
    return null;
  }

  return (
    <UserForm
      mode="edit"
      initial={initial}
      allowedRoles={allowedRoles}
      allowedLocations={allowedLocations}
      lockPrivilegedFields={lockPrivilegedFields}
      submitLabel="Save changes"
      onSubmit={onSubmit}
    />
  );
}
