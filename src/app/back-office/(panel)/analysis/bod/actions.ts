"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBodPct(formData: FormData) {
  const supabase = await createClient();
  const rows = [...formData.entries()]
    .filter(([k]) => k.startsWith("pct_"))
    .map(([k, v]) => ({ groomer_id: k.slice(4), bod_pct: Math.min(100, Math.max(0, Number(v) || 0)) / 100 }));
  const { error } = await supabase.from("bod_settings").upsert(rows, { onConflict: "groomer_id" });
  revalidatePath("/back-office/analysis/bod");
  redirect(`/back-office/analysis/bod?${error ? `error=${encodeURIComponent(error.message)}` : "ok=Tersimpan"}`);
}

export async function addBodMember(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (name) await supabase.from("bod_members").insert({ name });
  revalidatePath("/back-office/analysis/bod");
}

export async function toggleBodMember(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("bod_members").update({ active: String(formData.get("active")) !== "true" }).eq("id", String(formData.get("id")));
  revalidatePath("/back-office/analysis/bod");
}
