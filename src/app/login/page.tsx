import { redirect } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { LOCATIONS, LOCATION_META } from "@/lib/constants";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/orders");
  const { next } = await searchParams;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 p-10 text-white relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/5 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -top-20 -left-10 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl"
        />

        <div className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur overflow-hidden">
            <Image src="/pve-logo.webp" width={36} height={36} alt="PVE" className="object-contain" />
          </div>
          <span className="text-sm font-semibold tracking-wide">
            PVE Logistics Portal
          </span>
        </div>

        <div className="relative space-y-5 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            One portal for every PVE shipment, worldwide.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Container planning, purchase orders, replacement parts and
            backorder tracking — coordinated in real time across four global
            locations.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {LOCATIONS.map((l) => {
              const meta = LOCATION_META[l];
              return (
                <span
                  key={l}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-medium text-white/90"
                >
                  <span>{meta.flag}</span>
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} PVE Logistics. Enterprise build.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Sign in
            </h1>
            <p className="text-sm text-slate-500">
              Use your PVE corporate email to continue.
            </p>
          </div>
          <LoginForm nextPath={next} />
          <p className="text-xs text-slate-400 text-center">
            Need access? Contact your local administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
