import { sb } from "./sb";

export async function listElevatorModels() {
  const { data, error } = await sb()
    .from("ElevatorModel")
    .select("*")
    .eq("isActive", true)
    .order("modelCode", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
