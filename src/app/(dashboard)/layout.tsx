import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import {
  HeaderWithAuth,
  HeaderSkeleton,
} from "@/components/layout/header-with-auth";
import { PageTransition } from "@/components/layout/page-transition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Suspense fallback={<HeaderSkeleton />}>
          <HeaderWithAuth />
        </Suspense>
        <main className="px-6 py-6 lg:px-8">
          <PageTransition>
            <div className="space-y-6">{children}</div>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
