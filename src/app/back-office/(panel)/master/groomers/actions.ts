"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveGroomer(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const row = {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    commission_rate: Number(formData.get("commission_pct") ?? 25) / 100,
    active: formData.get("active") === "on",
    phone: String(formData.get("phone") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
  if (!row.code || !row.name) redirect("/back-office/master/groomers?error=Kode%20dan%20nama%20wajib");
  const { error } = id
    ? await supabase.from("groomers").update(row).eq("id", id)
    : await supabase.from("groomers").insert(row);
  if (error) redirect(`/back-office/master/groomers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/back-office/master/groomers");
  redirect("/back-office/master/groomers?ok=Tersimpan");
}
