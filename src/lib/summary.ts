import type { SupabaseClient } from "@supabase/supabase-js";

export type GroomerSummary = {
  groomer_id: string; groomer_name: string; invoices: number; gross: number; voucher: number;
  omzet: number; commission: number; bonus: number; trips: number; fuel: number; take_home: number; bersih: number;
};

export async function groomerSummary(supabase: SupabaseClient, from: string, to: string): Promise<GroomerSummary[]> {
  const { data, error } = await supabase.rpc("groomer_summary", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>[]).map((r) => ({
    groomer_id: String(r.groomer_id), groomer_name: String(r.groomer_name),
    invoices: Number(r.invoices), gross: Number(r.gross), voucher: Number(r.voucher), omzet: Number(r.omzet),
    commission: Number(r.commission), bonus: Number(r.bonus), trips: Number(r.trips), fuel: Number(r.fuel),
    take_home: Number(r.take_home), bersih: Number(r.bersih),
  }));
}

export const totals = (rows: GroomerSummary[]) =>
  rows.reduce(
    (a, r) => ({
      omzet: a.omzet + r.omzet, commission: a.commission + r.commission, bonus: a.bonus + r.bonus,
      fuel: a.fuel + r.fuel, take_home: a.take_home + r.take_home, bersih: a.bersih + r.bersih, invoices: a.invoices + r.invoices,
    }),
    { omzet: 0, commission: 0, bonus: 0, fuel: 0, take_home: 0, bersih: 0, invoices: 0 },
  );
