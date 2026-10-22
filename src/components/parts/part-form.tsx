"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { PART_CATEGORIES, type PartCategory } from "@/lib/constants";
import { apiFetch } from "@/lib/api-fetch";

export interface PartFormValues {
  sku: string;
  name: string;
  description: string;
  category: PartCategory;
  stockQty: number;
  reorderLevel: number;
  supplierId: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface Props {
  mode: "create" | "edit";
  partId?: string;
  initial?: Partial<PartFormValues>;
  suppliers: SupplierOption[];
}

interface FieldErrors {
  sku?: string;
  name?: string;
  stockQty?: string;
  reorderLevel?: string;
}

function validate(v: PartFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!v.sku.trim()) errors.sku = "Part number is required";
  if (!v.name.trim()) errors.name = "Name is required";
  if (v.stockQty < 0) errors.stockQty = "Cannot be negative";
  if (v.reorderLevel < 0) errors.reorderLevel = "Cannot be negative";
  return errors;
}

export function PartForm({ mode, partId, initial, suppliers }: Props) {
  const router = useRouter();
  const [values, setValues] = React.useState<PartFormValues>({
    sku: initial?.sku ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    category: (initial?.category ?? "General Parts") as PartCategory,
    stockQty: initial?.stockQty ?? 0,
    reorderLevel: initial?.reorderLevel ?? 0,
    supplierId: initial?.supplierId ?? "",
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function update<K extends keyof PartFormValues>(
    key: K,
    value: PartFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const v: PartFormValues = {
      ...values,
      sku: values.sku.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
    };
    const fieldErrors = validate(v);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    const url = mode === "create" ? "/api/parts" : `/api/parts/${partId}`;
    const res = await apiFetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      body: JSON.stringify({
        sku: v.sku,
        name: v.name,
        description: v.description || null,
        category: v.category,
        stockQty: Number(v.stockQty),
        reorderLevel: Number(v.reorderLevel),
        supplierId: v.supplierId || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setServerError(json?.error ?? "Failed to save part.");
      return;
    }
    if (mode === "create") {
      router.push(`/parts/${json.data.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Part Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sku">Part number *</Label>
            <Input
              id="sku"
              value={values.sku}
              onChange={(e) => update("sku", e.target.value)}
              maxLength={60}
            />
            {errors.sku && (
              <p className="text-xs text-rose-600">{errors.sku}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={120}
            />
            {errors.name && (
              <p className="text-xs text-rose-600">{errors.name}</p>
            )}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={500}
              placeholder="What is this part used for? Compatible models, finish, etc."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category *</Label>
            <Combobox
              id="category"
              value={values.category}
              onChange={(v) => update("category", v as PartCategory)}
              options={PART_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supplier">Supplier</Label>
            <Combobox
              id="supplier"
              value={values.supplierId}
              onChange={(v) => update("supplierId", v)}
              options={[
                { value: "", label: "— None —" },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="stockQty">Quantity on hand</Label>
            <Input
              id="stockQty"
              type="number"
              min={0}
              value={values.stockQty}
              onChange={(e) =>
                update("stockQty", Math.max(0, Number(e.target.value) || 0))
              }
            />
            {errors.stockQty && (
              <p className="text-xs text-rose-600">{errors.stockQty}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reorderLevel">Reorder level</Label>
            <Input
              id="reorderLevel"
              type="number"
              min={0}
              value={values.reorderLevel}
              onChange={(e) =>
                update(
                  "reorderLevel",
                  Math.max(0, Number(e.target.value) || 0),
                )
              }
            />
            <p className="text-xs text-slate-500">
              Stock at or below this level is flagged as "Reorder".
            </p>
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
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : mode === "create" ? (
            "Add part"
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
