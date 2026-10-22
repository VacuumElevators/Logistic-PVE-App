"use client";

import { useRouter } from "next/navigation";
import { UserForm, type UserFormValues } from "@/components/users/user-form";
import { apiFetch } from "@/lib/api-fetch";
import type { Database } from "@/types/database";

type Location = Database["public"]["Enums"]["Location"];
type UserRole = Database["public"]["Enums"]["UserRole"];

interface Props {
  allowedRoles: UserRole[];
  allowedLocations: Location[];
  defaultLocation: Location;
}

export function NewUserForm({
  allowedRoles,
  allowedLocations,
  defaultLocation,
}: Props) {
  const router = useRouter();

  async function onSubmit(values: UserFormValues): Promise<string | null> {
    const res = await apiFetch("/api/users", {
      method: "POST",
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json?.error ?? "Failed to create user.";
    }
    router.push(`/users/${json.data.id}`);
    router.refresh();
    return null;
  }

  return (
    <UserForm
      mode="create"
      initial={{ locationId: defaultLocation, role: "STAFF", status: "ACTIVE" }}
      allowedRoles={allowedRoles}
      allowedLocations={allowedLocations}
      submitLabel="Create user"
      onSubmit={onSubmit}
    />
  );
}
