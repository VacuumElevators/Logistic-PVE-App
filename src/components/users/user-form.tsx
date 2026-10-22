"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { LOCATION_META } from "@/lib/constants";
import { roleLabel } from "@/lib/permissions";
import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["UserRole"];
type Location = Database["public"]["Enums"]["Location"];
type UserStatus = Database["public"]["Enums"]["UserStatus"];

export interface UserFormValues {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  locationId: Location;
  status: UserStatus;
}

interface UserFormProps {
  mode: "create" | "edit";
  initial?: Partial<UserFormValues>;
  allowedRoles: UserRole[];
  allowedLocations: Location[];
  /** When true, role / location / status fields are disabled (e.g. editing self). */
  lockPrivilegedFields?: boolean;
  submitLabel?: string;
  /** Returns `null` on success or an error message string. */
  onSubmit: (values: UserFormValues) => Promise<string | null>;
  /** Overrides the Cancel button behavior (defaults to router.back()). */
  onCancel?: () => void;
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validate(values: UserFormValues, mode: "create" | "edit"): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2) errors.name = "Enter at least 2 characters";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email";
  }
  if (mode === "create") {
    if (!values.password || values.password.length < 8) {
      errors.password = "At least 8 characters";
    }
  } else if (values.password && values.password.length > 0 && values.password.length < 8) {
    errors.password = "At least 8 characters";
  }
  return errors;
}

export function UserForm({
  mode,
  initial,
  allowedRoles,
  allowedLocations,
  lockPrivilegedFields = false,
  submitLabel,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const router = useRouter();
  const [values, setValues] = React.useState<UserFormValues>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    password: "",
    role: (initial?.role ?? allowedRoles[allowedRoles.length - 1]) as UserRole,
    locationId: (initial?.locationId ?? allowedLocations[0]) as Location,
    status: (initial?.status ?? "ACTIVE") as UserStatus,
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function update<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const v: UserFormValues = {
      ...values,
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
    };
    const fieldErrors = validate(v, mode);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    const result = await onSubmit(v);
    setLoading(false);
    if (result) setServerError(result);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              autoComplete="name"
            />
            {errors.name && (
              <p className="text-xs text-rose-600">{errors.name}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-rose-600">{errors.email}</p>
            )}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="password">
              {mode === "create"
                ? "Temporary password"
                : "New password (leave blank to keep current)"}
            </Label>
            <Input
              id="password"
              type="password"
              value={values.password ?? ""}
              onChange={(e) => update("password", e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            {errors.password && (
              <p className="text-xs text-rose-600">{errors.password}</p>
            )}
            {mode === "edit" && (
              <p className="text-xs text-slate-500">
                Setting a new password signs the user out of all other devices.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Combobox
              id="role"
              value={values.role}
              onChange={(v) => update("role", v as UserRole)}
              disabled={lockPrivilegedFields}
              options={allowedRoles.map((r) => ({
                value: r,
                label: roleLabel(r),
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Combobox
              id="location"
              value={values.locationId}
              onChange={(v) => update("locationId", v as Location)}
              disabled={lockPrivilegedFields || allowedLocations.length === 1}
              options={allowedLocations.map((l) => ({
                value: l,
                label: LOCATION_META[l].label,
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Combobox
              id="status"
              value={values.status}
              onChange={(v) => update("status", v as UserStatus)}
              disabled={lockPrivilegedFields}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "SUSPENDED", label: "Suspended" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {serverError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => (onCancel ? onCancel() : router.back())}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            (submitLabel ?? (mode === "create" ? "Create user" : "Save changes"))
          )}
        </Button>
      </div>
    </form>
  );
}
