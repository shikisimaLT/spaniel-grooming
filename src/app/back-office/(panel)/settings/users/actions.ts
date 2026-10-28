"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function setRole(formData: FormData) {
  const me = await requireRole("owner");
  const id = String(formData.get("id"));
  const role = String(formData.get("role"));
  if (id === me.id || !["owner", "admin", "normal"].includes(role)) redirect("/back-office/settings/users?error=Tidak%20diizinkan");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/back-office/settings/users");
  redirect(`/back-office/settings/users?${error ? `error=${encodeURIComponent(error.message)}` : "ok=Role%20diubah"}`);
}
