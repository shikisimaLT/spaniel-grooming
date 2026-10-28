"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customer: z.string().trim().min(1, "Nama customer wajib"),
  groomer_id: z.string().uuid("Pilih groomer"),
  voucher_code: z.string().trim().optional(),
  voucher_amount: z.coerce.number().min(0).default(0),
  bonus: z.coerce.number().min(0).default(0),
  paid: z.boolean(),
  notes: z.string().trim().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty: z.coerce.number().int().min(1),
    discount: z.coerce.number().min(0).default(0),
    unit_price: z.coerce.number().min(0).optional(),
    commission_rate: z.coerce.number().min(0).max(1).optional(),
  })).min(1, "Tambahkan minimal satu item"),
});

function parseInvoice(formData: FormData) {
  let items: unknown = [];
  try { items = JSON.parse(String(formData.get("items") ?? "[]")); } catch { /* handled by schema */ }
  return schema.safeParse({
    date: formData.get("date"),
    customer: formData.get("customer"),
    groomer_id: formData.get("groomer_id"),
    voucher_code: formData.get("voucher_code") || undefined,
    voucher_amount: formData.get("voucher_amount") || 0,
    bonus: formData.get("bonus") || 0,
    paid: formData.get("paid") === "on",
    notes: formData.get("notes") || undefined,
    items,
  });
}

export async function updateInvoice(_: unknown, formData: FormData): Promise<{ error: string } | undefined> {
  const parsed = parseInvoice(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_invoice", {
    p_id: String(formData.get("id")),
    p_date: v.date,
    p_customer_name: v.customer,
    p_groomer_id: v.groomer_id,
    p_items: v.items,
    p_voucher_code: v.voucher_code ?? null,
    p_voucher_amount: v.voucher_amount,
    p_bonus: v.bonus,
    p_notes: v.notes ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/back-office/transactions");
  revalidatePath("/back-office");
  redirect(`/back-office/transactions?m=${v.date.slice(0, 7)}&ok=${encodeURIComponent("Invoice diperbarui")}`);
}

export async function createInvoice(_: unknown, formData: FormData): Promise<{ error: string } | undefined> {
  const parsed = parseInvoice(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_invoice", {
    p_date: v.date,
    p_customer_name: v.customer,
    p_groomer_id: v.groomer_id,
    p_items: v.items,
    p_voucher_code: v.voucher_code ?? null,
    p_voucher_amount: v.voucher_amount,
    p_bonus: v.bonus,
    p_paid: v.paid,
    p_notes: v.notes ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/back-office/transactions");
  revalidatePath("/back-office");
  redirect(`/back-office/transactions?m=${v.date.slice(0, 7)}&ok=${encodeURIComponent("Invoice tersimpan")}`);
}

export async function togglePaid(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("invoices").update({ paid: String(formData.get("paid")) !== "true" }).eq("id", String(formData.get("id")));
  revalidatePath("/back-office/transactions");
}

export async function deleteInvoice(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", String(formData.get("id"))).eq("paid", false);
  revalidatePath("/back-office/transactions");
  revalidatePath("/back-office");
  if (error) redirect(`/back-office/transactions?error=${encodeURIComponent(error.message)}`);
}
