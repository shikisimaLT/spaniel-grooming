import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Field, Msg, PageHead } from "@/components/ui";
import { pct } from "@/lib/format";
import { saveGroomer } from "./actions";

type Groomer = { id: string; code: string; name: string; commission_rate: number; active: boolean; phone: string | null; notes: string | null };

export default async function GroomersPage({
  searchParams,
}: { searchParams: Promise<{ edit?: string; error?: string; ok?: string }> }) {
  await requireRole("owner", "admin");
  const { edit, error, ok } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("groomers").select("*").order("code");
  const rows = (data ?? []) as Groomer[];
  const cur = edit ? rows.find((r) => r.id === edit) ?? null : null;

  return (
    <>
      <PageHead eyebrow="Master" title="Groomer" />
      <Msg error={error} ok={ok} />
      <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
        <div className="scroll-x panel p-0">
          <table className="ledger">
            <thead><tr><th>Kode</th><th>Nama</th><th>Komisi</th><th>Status</th><th>HP</th><th /></tr></thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id}>
                  <td className="font-mono">{g.code}</td>
                  <td className="font-semibold">{g.name}</td>
                  <td className="num">{pct(g.commission_rate)}</td>
                  <td><span className={`tag ${g.active ? "ok" : "warn"}`}>{g.active ? "Aktif" : "Nonaktif"}</span></td>
                  <td>{g.phone ?? "—"}</td>
                  <td className="r"><Link className="underline" href={`?edit=${g.id}`}>Ubah</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={saveGroomer} key={cur?.id ?? "new"} className="panel space-y-3 self-start">
          <h2>{cur ? "Ubah groomer" : "Groomer baru"}</h2>
          {cur && <input type="hidden" name="id" value={cur.id} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode" name="code" defaultValue={cur?.code} required placeholder="G04" />
            <Field label="Komisi (%)" name="commission_pct" type="number" step="0.01" defaultValue={cur ? cur.commission_rate * 100 : 25} required />
          </div>
          <Field label="Nama" name="name" defaultValue={cur?.name} required />
          <Field label="No. HP" name="phone" defaultValue={cur?.phone} />
          <Field label="Keterangan" name="notes" defaultValue={cur?.notes} />
          <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={cur?.active ?? true} /> Aktif</label>
          <div className="flex gap-2">
            <button className="btn">Simpan</button>
            {cur && <Link className="btn ghost" href="/back-office/master/groomers">Batal</Link>}
          </div>
        </form>
      </div>
    </>
  );
}
