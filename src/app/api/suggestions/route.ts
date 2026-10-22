import { z } from "zod";
import { sb } from "@/lib/sb";
import { apiError, apiOk, parseJson, requireApiSession } from "@/lib/api";

const createSchema = z.object({
  message: z.string().min(3).max(2000),
});

// Any signed-in user (including read-only VIEWERs) can submit a suggestion.
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  const parsed = await parseJson(request, createSchema);
  if ("error" in parsed) return parsed.error;

  const client = sb();
  const { data, error } = await client
    .from("Suggestion")
    .insert({
      createdById: auth.session.sub,
      message: parsed.data.message.trim(),
    })
    .select("id")
    .single();
  if (error) return apiError(error.message, 500);

  return apiOk({ id: data.id }, { status: 201 });
}
