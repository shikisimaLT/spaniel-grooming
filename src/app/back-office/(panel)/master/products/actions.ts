"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const back = (kind: "error" | "ok", msg: string, extra = "") =>
  redirect(`/back-office/master/products?${kind}=${encodeURIComponent(msg)}${extra}`);

export async function saveProduct(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const overridePct = String(formData.get("override_pct") ?? "").trim();
  const row = {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "Jasa Utama"),
    active: formData.get("active") === "on",
    commission_override: overridePct === "" ? null : Number(overridePct) / 100,
  };
  if (!row.code || !row.name) back("error", "Kode dan nama wajib");

  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) back("error", error.message);
  } else {
    const price = Number(formData.get("price"));
    const from = String(formData.get("active_from") ?? "");
    if (!(price >= 0) || !from) back("error", "Harga awal & tanggal berlaku wajib untuk produk baru");
    const { data, error } = await supabase.from("products").insert(row).select("id").single();
    if (error || !data) back("error", error?.message ?? "Gagal");
    const { error: e2 } = await supabase.from("product_prices").insert({ product_id: data!.id, price, active_from: from });
    if (e2) back("error", e2.message);
  }
  revalidatePath("/back-office/master/products");
  back("ok", "Tersimpan");
}

/** Price changes are append-only: a DB trigger closes the previous open price the day before. */
export async function addPrice(formData: FormData) {
  const supabase = await createClient();
  const product_id = String(formData.get("product_id") ?? "");
  const price = Number(formData.get("price"));
  const active_from = String(formData.get("active_from") ?? "");
  if (!product_id || !(price >= 0) || !active_from) back("error", "Lengkapi produk, harga, dan tanggal");
  const { error } = await supabase.from("product_prices").insert({ product_id, price, active_from });
  if (error) back("error", error.message.includes("no_overlap") ? "Tanggal berlaku bentrok dengan harga yang sudah ada" : error.message);
  revalidatePath("/back-office/master/products");
  back("ok", "Harga baru ditambahkan", `&hist=${product_id}`);
}
