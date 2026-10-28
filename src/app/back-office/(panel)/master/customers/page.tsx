import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Field, Msg, PageHead, SortTh, parseSort } from "@/components/ui";
import { saveCustomer } from "./actions";

const SORTS = ["name", "address", "phone", "area", "customer_status", "repeat_order", "pet_count"] as const;

type Customer = {
  id: string; name: string; phone: string | null; address: string | null; area: string | null;
  customer_status: string; repeat_order: string | null; repeat_days: string | null;
  pet_breed: string | null; pet_notes: string | null; pet_count: number | null; notes: string | null;
};

export default async function CustomersPage({
  searchParams,
}: { searchParams: Promise<{ edit?: string; q?: string; sort?: string; dir?: string; error?: string; ok?: string }> }) {
  await requireRole("owner", "admin");
  const { edit, q, error, ok, ...sp } = await searchParams;
  const { sort, dir } = parseSort(sp.sort, sp.dir, SORTS, "name", "asc");
  const th = { sort, dir, params: { q } };
  const supabase = await createClient();
  let query = supabase.from("customers").select("*").order(sort, { ascending: dir === "asc", nullsFirst: false }).order("name").limit(500);
  if (q) query = query.ilike("name", `%${q.replace(/[%,]/g, "")}%`);
  const { data } = await query;
  const rows = (data ?? []) as Customer[];
  const cur = edit ? rows.find((r) => r.id === edit) ?? null : null;

  return (
    <>
      <PageHead eyebrow="Master" title="Customer">
        <form className="flex gap-2">
          <input className="input" name="q" defaultValue={q} placeholder="Cari nama…" aria-label="Cari customer" />
          <button className="btn ghost">Cari</button>
        </form>
      </PageHead>
      <Msg error={error} ok={ok} />
      <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
        <div className="scroll-x panel p-0">
          <table className="ledger">
            <thead>
              <tr>
                <SortTh label="Nama" field="name" {...th} />
                <SortTh label="Alamat" field="address" {...th} />
                <SortTh label="Telepon" field="phone" {...th} />
                <SortTh label="Area" field="area" {...th} />
                <SortTh label="Status" field="customer_status" {...th} />
                <SortTh label="Repeat" field="repeat_order" {...th} />
                <SortTh label="Pets" field="pet_count" {...th} />
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td className="max-w-64">{c.address ?? "—"}</td>
                  <td className="whitespace-nowrap">{c.phone ?? "—"}</td>
                  <td>{c.area ?? "—"}</td>
                  <td>{c.customer_status}</td>
                  <td>{c.repeat_order ?? "—"}{c.repeat_days ? ` · ${c.repeat_days} hr` : ""}</td>
                  <td>{c.pet_count ?? "—"} {c.pet_breed ?? ""}</td>
                  <td className="r"><Link className="underline" href={`?edit=${c.id}`}>Ubah</Link></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="text-muted">Belum ada customer.</td></tr>}
            </tbody>
          </table>
        </div>
        <form action={saveCustomer} key={cur?.id ?? "new"} className="panel space-y-3 self-start">
          <h2>{cur ? "Ubah customer" : "Customer baru"}</h2>
          {cur && <input type="hidden" name="id" value={cur.id} />}
          <Field label="Nama" name="name" defaultValue={cur?.name} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telepon" name="phone" defaultValue={cur?.phone} />
            <Field label="Area" name="area" defaultValue={cur?.area} />
          </div>
          <Field label="Alamat" name="address" defaultValue={cur?.address} />
          <div className="grid grid-cols-3 gap-3">
            <label className="field"><span>Status</span>
              <select className="input" name="customer_status" defaultValue={cur?.customer_status ?? "Baru"}>
                <option>Baru</option><option>Lama</option>
              </select></label>
            <label className="field"><span>Repeat</span>
              <select className="input" name="repeat_order" defaultValue={cur?.repeat_order ?? ""}>
                <option value="">—</option><option value="Y">Y</option><option value="N">N</option><option value="T">T</option>
              </select></label>
            <Field label="Tiap (hari)" name="repeat_days" defaultValue={cur?.repeat_days} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ras pets" name="pet_breed" defaultValue={cur?.pet_breed} />
            <Field label="Jumlah pets" name="pet_count" type="number" defaultValue={cur?.pet_count} />
          </div>
          <Field label="Catatan" name="notes" defaultValue={cur?.notes} />
          <div className="flex gap-2">
            <button className="btn">Simpan</button>
            {cur && <Link className="btn ghost" href="/back-office/master/customers">Batal</Link>}
          </div>
        </form>
      </div>
    </>
  );
}
