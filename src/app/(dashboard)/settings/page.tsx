import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LOCATION_META, LOCATIONS } from "@/lib/constants";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="System preferences, integrations and global configuration."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {LOCATIONS.map((l) => {
              const meta = LOCATION_META[l];
              return (
                <div
                  key={l}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.flag}</span>
                    <p className="font-medium text-slate-900">{meta.label}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    Currency: {meta.currency}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              SMTP is configured via <code>SMTP_HOST</code>,{" "}
              <code>SMTP_PORT</code>, <code>SMTP_USER</code>,{" "}
              <code>SMTP_PASS</code>, <code>SMTP_FROM</code> in{" "}
              <code>.env</code>.
            </p>
            <p>
              When SMTP isn't set, the system logs emails to the server console
              instead of sending — useful for local development.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
