import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui";
import { InvoiceForm } from "./invoice-form";

export default async function NewTransactionPage() {
  await getProfile();
  const supabase = await createClient();
  const [c, g, p, pr] = await Promise.all([
    supabase.from("customers").select("name").order("name").limit(2000),
    supabase.from("groomers").select("id,name,commission_rate").eq("active", true).order("code"),
    supabase.from("products").select("id,code,name,category,commission_override").eq("active", true).order("code"),
    supabase.from("product_prices").select("product_id,price,active_from,active_to"),
  ]);
  return (
    <>
      <PageHead eyebrow="Harian" title="Transaksi baru" />
      <InvoiceForm
        customers={(c.data ?? []).map((x) => x.name as string)}
        groomers={(g.data ?? []) as { id: string; name: string; commission_rate: number }[]}
        products={(p.data ?? []) as { id: string; code: string; name: string; category: string; commission_override: number | null }[]}
        prices={(pr.data ?? []) as { product_id: string; price: number; active_from: string; active_to: string | null }[]}
      />
    </>
  );
}
