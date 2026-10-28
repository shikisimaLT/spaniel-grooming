import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "admin" | "normal";
export type Profile = { id: string; name: string; role: Role };

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/back-office/login");
  const { data } = await supabase.from("profiles").select("id,name,role").eq("id", user.id).single();
  if (!data) redirect("/back-office/login");
  return data as Profile;
}

export async function requireRole(...roles: Role[]): Promise<Profile> {
  const p = await getProfile();
  if (!roles.includes(p.role)) redirect("/back-office/transactions");
  return p;
}

export const isStaff = (r: Role) => r === "owner" || r === "admin";
