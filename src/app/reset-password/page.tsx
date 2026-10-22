import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Choose a new password
          </h1>
          <p className="text-sm text-slate-500">
            Enter your new password to finish resetting your account.
          </p>
        </div>
        <ResetPasswordForm />
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
