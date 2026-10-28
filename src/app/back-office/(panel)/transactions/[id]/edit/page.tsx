import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui";
import { InvoiceForm } from "../../new/invoice-form";

type Inv = {
  id: string; invoice_no: string; invoice_date: string; paid: boolean; groomer_id: string;
  voucher_code: string | null; voucher_amount: number; bonus: number; notes: string | null;
  customer: { name: string } | null;
  items: { product_id: string; qty: number; unit_price: number; discount: number; commission_rate: number }[];
};

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("owner", "admin");
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id,invoice_no,invoice_date,paid,groomer_id,voucher_code,voucher_amount,bonus,notes,customer:customers(name),items:invoice_items(product_id,qty,unit_price,discount,commission_rate,created_at)")
    .eq("id", id).maybeSingle();
  const inv = data as unknown as Inv | null;
  if (!inv) notFound();
  if (inv.paid) redirect("/back-office/transactions?error=" + encodeURIComponent("Invoice yang sudah lunas tidak bisa diubah. Ubah status ke Belum dulu."));

  const [c, g, p, pr] = await Promise.all([
    supabase.from("customers").select("name").order("name").limit(2000),
    supabase.from("groomers").select("id,name,commission_rate,active").order("code"),
    supabase.from("products").select("id,code,name,category,commission_override").order("code"),
    supabase.from("product_prices").select("product_id,price,active_from,active_to"),
  ]);
  return (
    <>
      <PageHead eyebrow={`Harian · ${inv.invoice_no}`} title="Ubah transaksi" />
      <InvoiceForm
        customers={(c.data ?? []).map((x) => x.name as string)}
        groomers={(g.data ?? []) as { id: string; name: string; commission_rate: number }[]}
        products={(p.data ?? []) as { id: string; code: string; name: string; category: string; commission_override: number | null }[]}
        prices={(pr.data ?? []) as { product_id: string; price: number; active_from: string; active_to: string | null }[]}
        initial={{
          id: inv.id, date: inv.invoice_date, customer: inv.customer?.name ?? "", groomerId: inv.groomer_id,
          voucherCode: inv.voucher_code ?? "", voucherAmount: Number(inv.voucher_amount), bonus: Number(inv.bonus), notes: inv.notes ?? "",
          lines: inv.items.map((i, n) => ({
            key: n + 1, product_id: i.product_id, qty: i.qty, discount: Number(i.discount),
            unit_price: Number(i.unit_price), commission_rate: Number(i.commission_rate),
          })),
        }}
      />
    </>
  );
}
