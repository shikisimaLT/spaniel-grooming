import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Msg, PageHead } from "@/components/ui";
import { currentMonth, monthRange, pct, rp } from "@/lib/format";
import { groomerSummary } from "@/lib/summary";
import { addBodMember, saveBodPct, toggleBodMember } from "./actions";

export default async function BodPage({
  searchParams,
}: { searchParams: Promise<{ m?: string; error?: string; ok?: string }> }) {
  await requireRole("owner");
  const { m = currentMonth(), error, ok } = await searchParams;
  const { from, to } = monthRange(m);
  const supabase = await createClient();
  const [rows, s, mem, exp, gr] = await Promise.all([
    groomerSummary(supabase, from, to),
    supabase.from("bod_settings").select("groomer_id,bod_pct"),
    supabase.from("bod_members").select("id,name,active").order("created_at"),
    supabase.from("expenses").select("amount").gte("expense_date", from).lte("expense_date", to),
    supabase.from("groomers").select("id").eq("active", true),
  ]);
  const pctMap = new Map((s.data ?? []).map((x) => [x.groomer_id as string, Number(x.bod_pct)]));
  const members = (mem.data ?? []) as { id: string; name: string; active: boolean }[];
  const activeMembers = members.filter((x) => x.active);
  const expense = (exp.data ?? []).reduce((a, e) => a + Number(e.amount), 0);
  const share = expense / Math.max(1, (gr.data ?? []).length);

  const calc = rows.map((g) => {
    const net = g.bersih - (g.omzet > 0 ? share : 0);
    const p = pctMap.get(g.groomer_id) ?? 0;
    return { ...g, net, p, bod: Math.max(0, net) * p, owner: net - Math.max(0, net) * p };
  });
  const bodTotal = calc.reduce((a, r) => a + r.bod, 0);
  const ownerTotal = calc.reduce((a, r) => a + r.owner, 0);

  return (
    <>
      <PageHead eyebrow="Analisa" title="Bagi hasil BOD">
        <form className="flex gap-2">
          <input className="input" type="month" name="m" defaultValue={m} aria-label="Bulan" />
          <button className="btn ghost">Tampilkan</button>
        </form>
      </PageHead>
      <Msg error={error} ok={ok} />
      <p className="mb-4 max-w-2xl text-muted">
        Bersih per groomer = omzet − komisi − bonus − bensin − porsi expense operasional ({rp(share)} per groomer aktif).
        Bagian BOD = bersih × persen groomer tersebut; sisanya milik owner.
      </p>

      <form action={saveBodPct}>
        <div className="scroll-x panel p-0">
          <table className="ledger">
            <thead><tr><th>Groomer</th><th className="r">Omzet</th><th className="r">Bersih (setelah expense)</th><th style={{ width: 110 }}>% BOD</th><th className="r">Bagian BOD</th><th className="r">Bagian Owner</th></tr></thead>
            <tbody>
              {calc.map((g) => (
                <tr key={g.groomer_id}>
                  <td className="font-semibold">{g.groomer_name}</td>
                  <td className="r">{rp(g.omzet)}</td>
                  <td className="r">{rp(g.net)}</td>
                  <td><input className="input" type="number" min={0} max={100} step="0.01" name={`pct_${g.groomer_id}`} defaultValue={g.p * 100} aria-label={`Persen BOD ${g.groomer_name}`} /></td>
                  <td className="r">{rp(g.bod)}</td>
                  <td className="r">{rp(g.owner)}</td>
                </tr>
              ))}
              <tr><td className="font-bold">Total</td><td /><td /><td /><td className="r figure text-lg font-bold">{rp(bodTotal)}</td><td className="r figure text-lg font-bold">{rp(ownerTotal)}</td></tr>
            </tbody>
          </table>
        </div>
        <button className="btn mt-3">Simpan persentase</button>
      </form>

      <section className="panel mt-8">
        <h2>Anggota BOD</h2>
        <ul className="mt-3 divide-y divide-rule">
          {members.map((x) => (
            <li key={x.id} className="flex items-center justify-between py-2">
              <span className={x.active ? "" : "text-muted line-through"}>{x.name}</span>
              <span className="flex items-center gap-4">
                {x.active && <b className="figure">{rp(bodTotal / Math.max(1, activeMembers.length))}</b>}
                <form action={toggleBodMember}>
                  <input type="hidden" name="id" value={x.id} /><input type="hidden" name="active" value={String(x.active)} />
                  <button className="text-sm underline">{x.active ? "Nonaktifkan" : "Aktifkan"}</button>
                </form>
              </span>
            </li>
          ))}
          {members.length === 0 && <li className="py-2 text-muted">Belum ada anggota BOD.</li>}
        </ul>
        <form action={addBodMember} className="mt-3 flex gap-2">
          <input className="input max-w-xs" name="name" placeholder="Nama anggota" required />
          <button className="btn ghost">Tambah</button>
        </form>
        <p className="mt-2 text-sm text-muted">Bagian BOD dibagi rata ke anggota aktif ({activeMembers.length} orang, {pct(activeMembers.length ? 1 / activeMembers.length : 0)} masing-masing).</p>
      </section>
    </>
  );
}
