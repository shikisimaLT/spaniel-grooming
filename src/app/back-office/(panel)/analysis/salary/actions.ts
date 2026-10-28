"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Saves bensin trips for each groomer on the period's end date (one row per groomer per day). */
export async function saveFuel(formData: FormData) {
  const supabase = await createClient();
  const logDate = String(formData.get("log_date"));
  const back = String(formData.get("back"));
  const rows = [...formData.entries()]
    .filter(([k]) => k.startsWith("trips_"))
    .map(([k, v]) => ({ groomer_id: k.slice(6), log_date: logDate, trips: Math.max(0, Number(v) || 0) }));
  const { error } = await supabase.from("fuel_logs").upsert(rows, { onConflict: "groomer_id,log_date" });
  revalidatePath("/back-office/analysis/salary");
  redirect(`/back-office/analysis/salary?${back}${error ? `&error=${encodeURIComponent(error.message)}` : ""}`);
}
