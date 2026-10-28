import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Field, Msg, PageHead } from "@/components/ui";
import { dateLabel, pct, rp, today } from "@/lib/format";
import { addPrice, saveProduct } from "./actions";

type Product = { id: string; code: string; name: string; category: string; active: boolean; commission_override: number | null };
type Price = { id: string; product_id: string; price: number; active_from: string; active_to: string | null };

export default async function ProductsPage({
  searchParams,
}: { searchParams: Promise<{ edit?: string; hist?: string; error?: string; ok?: string }> }) {
  await requireRole("owner", "admin");
  const { edit, hist, error, ok } = await searchParams;
  const supabase = await createClient();
  const [{ data: p }, { data: pr }] = await Promise.all([
    supabase.from("products").select("*").order("code"),
    supabase.from("product_prices").select("*").order("active_from", { ascending: false }),
  ]);
  const products = (p ?? []) as Product[];
  const prices = (pr ?? []) as Price[];
  const t = today();
  const current = new Map<string, Price>();
  for (const x of prices) {
    if (x.active_from <= t && (!x.active_to || x.active_to >= t) && !current.has(x.product_id)) current.set(x.product_id, x);
  }
  const cur = edit ? products.find((r) => r.id === edit) ?? null : null;
  const histProduct = hist ? products.find((r) => r.id === hist) ?? null : null;
  const history = histProduct ? prices.filter((x) => x.product_id === histProduct.id) : [];

  return (
    <>
      <PageHead eyebrow="Master" title="Produk & Harga" />
      <Msg error={error} ok={ok} />
      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <div className="scroll-x panel p-0">
            <table className="ledger">
              <thead><tr><th>Kode</th><th>Produk</th><th>Kategori</th><th className="r">Harga aktif</th><th>Komisi</th><th /></tr></thead>
              <tbody>
                {products.map((x) => (
                  <tr key={x.id} className={x.active ? "" : "opacity-50"}>
                    <td className="font-mono">{x.code}</td>
                    <td className="font-semibold">{x.name}</td>
                    <td>{x.category}</td>
                    <td className="r">{current.get(x.id) ? rp(current.get(x.id)!.price) : <span className="tag warn">Tanpa harga</span>}</td>
                    <td>{x.commission_override != null ? pct(x.commission_override) : "Ikut groomer"}</td>
                    <td className="r whitespace-nowrap">
                      <Link className="underline" href={`?hist=${x.id}`}>Harga</Link>{" · "}
                      <Link className="underline" href={`?edit=${x.id}`}>Ubah</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {histProduct && (
            <div className="panel">
              <h2>Riwayat harga — {histProduct.name}</h2>
              <table className="ledger mt-3">
                <thead><tr><th>Berlaku mulai</th><th>Sampai</th><th className="r">Harga</th></tr></thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{dateLabel(h.active_from)}</td>
                      <td>{h.active_to ? dateLabel(h.active_to) : <span className="tag ok">Berjalan</span>}</td>
                      <td className="r">{rp(h.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <form action={addPrice} className="mt-4 grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                <input type="hidden" name="product_id" value={histProduct.id} />
                <Field label="Harga baru (Rp)" name="price" type="number" required />
                <Field label="Berlaku mulai" name="active_from" type="date" defaultValue={t} required />
                <button className="btn">Tambah harga</button>
              </form>
              <p className="mt-2 text-sm text-muted">Harga lama tidak diubah — akan otomatis ditutup sehari sebelum tanggal berlaku harga baru.</p>
            </div>
          )}
        </div>

        <form action={saveProduct} key={cur?.id ?? "new"} className="panel space-y-3 self-start">
          <h2>{cur ? "Ubah produk" : "Produk baru"}</h2>
          {cur && <input type="hidden" name="id" value={cur.id} />}
          <Field label="Kode" name="code" defaultValue={cur?.code} required placeholder="P011" />
          <Field label="Nama produk" name="name" defaultValue={cur?.name} required />
          <label className="field"><span>Kategori</span>
            <select className="input" name="category" defaultValue={cur?.category ?? "Jasa Utama"}>
              <option>Jasa Utama</option><option>Add-on</option>
            </select></label>
          <Field label="Override komisi (%) — kosong = ikut groomer" name="override_pct" type="number" step="0.01"
            defaultValue={cur?.commission_override != null ? cur.commission_override * 100 : ""} />
          {!cur && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga awal" name="price" type="number" required />
              <Field label="Berlaku mulai" name="active_from" type="date" defaultValue={t} required />
            </div>
          )}
          <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={cur?.active ?? true} /> Aktif</label>
          <div className="flex gap-2">
            <button className="btn">Simpan</button>
            {cur && <Link className="btn ghost" href="/back-office/master/products">Batal</Link>}
          </div>
        </form>
      </div>
    </>
  );
}
