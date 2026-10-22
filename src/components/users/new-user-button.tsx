"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function NewUserButton({
  allowedRoles,
  allowedLocations,
  defaultLocation,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Portal target (document.body) is client-only — gate render until mounted.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Let an open combobox/date popover handle Escape instead of the dialog.
      if (document.querySelector("[data-radix-popper-content-wrapper]")) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function onSubmit(values: UserFormValues): Promise<string | null> {
    const res = await apiFetch("/api/users", {
      method: "POST",
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json?.error ?? "Failed to create user.";
    }
    // Close the popup and refresh the table in place — no navigation.
    setOpen(false);
    router.refresh();
    return null;
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New User</Button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
          >
            <button
              aria-label="Close"
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <div className="relative my-auto w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 animate-fade-in">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 pt-5 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    New User
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Create a portal account and assign role + location.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-6 py-5">
                <UserForm
                  mode="create"
                  initial={{
                    locationId: defaultLocation,
                    role: "STAFF",
                    status: "ACTIVE",
                  }}
                  allowedRoles={allowedRoles}
                  allowedLocations={allowedLocations}
                  submitLabel="Create user"
                  onSubmit={onSubmit}
                  onCancel={() => setOpen(false)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
