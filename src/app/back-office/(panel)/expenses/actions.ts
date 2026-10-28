"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addExpense(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    expense_date: String(formData.get("expense_date")),
    name: String(formData.get("name") ?? "").trim(),
    amount: Number(formData.get("amount")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/back-office/expenses");
  if (error) redirect(`/back-office/expenses?error=${encodeURIComponent(error.message)}`);
}

export async function deleteExpense(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", String(formData.get("id")));
  revalidatePath("/back-office/expenses");
}
