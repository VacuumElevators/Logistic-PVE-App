"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-fetch";

interface ManagerCandidate {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  code: string;
  canWrite: boolean;
  canToggleEnable: boolean;
  initial: {
    name: string;
    country: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    currency: string;
    timezone: string;
    flag: string;
    isEnabled: boolean;
    managerId: string;
  };
  managerCandidates: ManagerCandidate[];
}

export function LocationEditForm({
  code,
  canWrite,
  canToggleEnable,
  initial,
  managerCandidates,
}: Props) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);
  const [togglingEnabled, setTogglingEnabled] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  function setField<K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      country: values.country.trim(),
      city: values.city.trim() || null,
      address: values.address.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      currency: values.currency.trim().toUpperCase() || "USD",
      timezone: values.timezone.trim() || null,
      flag: values.flag.trim() || null,
      managerId: values.managerId || null,
    };

    const res = await apiFetch(`/api/locations/${code}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json?.error ?? "Failed to save changes.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function toggleEnabled() {
    setTogglingEnabled(true);
    setError(null);
    const res = await apiFetch(`/api/locations/${code}`, {
      method: "PATCH",
      body: JSON.stringify({ isEnabled: !values.isEnabled }),
    });
    const json = await res.json().catch(() => ({}));
    setTogglingEnabled(false);
    if (!res.ok) {
      setError(json?.error ?? "Failed to update status.");
      return;
    }
    setField("isEnabled", !values.isEnabled);
    router.refresh();
  }

  if (!canWrite) {
    return (
      <Card className="p-6 text-sm text-slate-500">
        You can view this location but cannot make changes.
      </Card>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Location Details</CardTitle>
          {canToggleEnable && (
            <Button
              type="button"
              variant={values.isEnabled ? "danger" : "primary"}
              size="sm"
              onClick={toggleEnabled}
              disabled={togglingEnabled}
            >
              <Power className="h-3.5 w-3.5" />
              {values.isEnabled ? "Disable location" : "Enable location"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Display name" required>
            <Input
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </Field>
          <Field label="Country" required>
            <Input
              value={values.country}
              onChange={(e) => setField("country", e.target.value)}
            />
          </Field>
          <Field label="City">
            <Input
              value={values.city}
              onChange={(e) => setField("city", e.target.value)}
            />
          </Field>
          <Field label="Address">
            <Input
              value={values.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={values.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </Field>
          <Field label="Currency (ISO 4217)">
            <Input
              maxLength={3}
              value={values.currency}
              onChange={(e) =>
                setField("currency", e.target.value.toUpperCase())
              }
            />
          </Field>
          <Field label="Timezone">
            <Input
              value={values.timezone}
              placeholder="e.g. America/New_York"
              onChange={(e) => setField("timezone", e.target.value)}
            />
          </Field>
          <Field label="Flag emoji">
            <Input
              maxLength={4}
              value={values.flag}
              onChange={(e) => setField("flag", e.target.value)}
            />
          </Field>
          <Field label="Manager">
            <Combobox
              aria-label="Manager"
              value={values.managerId}
              onChange={(v) => setField("managerId", v)}
              options={[
                { value: "", label: "— Unassigned —" },
                ...managerCandidates.map((m) => ({
                  value: m.id,
                  label: `${m.name} (${m.role})`,
                })),
              ]}
            />
            {managerCandidates.length === 0 && (
              <p className="text-xs text-slate-500">
                No eligible managers in this location yet. Promote a user from
                the Users page first.
              </p>
            )}
          </Field>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}
