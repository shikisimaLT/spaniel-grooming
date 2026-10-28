"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const s = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
};

export async function saveCustomer(formData: FormData) {
  const supabase = await createClient();
  const id = s(formData.get("id"));
  const row = {
    name: s(formData.get("name")),
    phone: s(formData.get("phone")),
    address: s(formData.get("address")),
    area: s(formData.get("area")),
    customer_status: s(formData.get("customer_status")) ?? "Baru",
    repeat_order: s(formData.get("repeat_order")),
    repeat_days: s(formData.get("repeat_days")),
    pet_breed: s(formData.get("pet_breed")),
    pet_notes: s(formData.get("pet_notes")),
    pet_count: s(formData.get("pet_count")) ? Number(formData.get("pet_count")) : null,
    notes: s(formData.get("notes")),
  };
  if (!row.name) redirect("/back-office/master/customers?error=Nama%20wajib%20diisi");
  const { error } = id
    ? await supabase.from("customers").update(row).eq("id", id)
    : await supabase.from("customers").insert(row);
  if (error) redirect(`/back-office/master/customers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/back-office/master/customers");
  redirect("/back-office/master/customers?ok=Tersimpan");
}
