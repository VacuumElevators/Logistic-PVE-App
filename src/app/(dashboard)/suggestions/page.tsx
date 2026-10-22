import { redirect } from "next/navigation";
import { sb } from "@/lib/sb";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SuggestionForm } from "@/components/suggestions/suggestion-form";
import {
  SuggestionList,
  type SuggestionRow,
} from "@/components/suggestions/suggestion-list";

export const dynamic = "force-dynamic";

export default async function SuggestionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // MANAGER and up can review everyone's suggestions; others just submit.
  const isReviewer = can(session, "settings.read");

  let suggestions: SuggestionRow[] = [];
  if (isReviewer) {
    const { data } = await sb()
      .from("Suggestion")
      .select(
        "id, message, status, createdAt, createdBy:User!Suggestion_createdById_fkey(name), resolvedBy:User!Suggestion_resolvedById_fkey(name)",
      )
      .order("status", { ascending: true })
      .order("createdAt", { ascending: false });
    suggestions = (data ?? []) as unknown as SuggestionRow[];
  }

  return (
    <>
      <PageHeader
        title="Suggestions"
        description="Share ideas and feedback to help improve the portal."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SuggestionForm />
        </div>
        {isReviewer && (
          <div className="lg:col-span-2">
            <SuggestionList suggestions={suggestions} />
          </div>
        )}
      </div>
    </>
  );
}
