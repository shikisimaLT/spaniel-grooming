import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Msg, PageHead } from "@/components/ui";
import { setRole } from "./actions";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const me = await requireRole("owner");
  const { error, ok } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id,name,role,created_at").order("created_at");
  const rows = (data ?? []) as { id: string; name: string; role: string }[];
  return (
    <>
      <PageHead eyebrow="Sistem" title="Pengguna" />
      <Msg error={error} ok={ok} />
      <div className="scroll-x panel p-0">
        <table className="ledger">
          <thead><tr><th>Nama</th><th>Role</th><th /></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.name}{u.id === me.id && " (kamu)"}</td>
                <td>
                  <form action={setRole} className="flex gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select className="input max-w-40" name="role" defaultValue={u.role} disabled={u.id === me.id}>
                      <option value="owner">Owner</option><option value="admin">Admin</option><option value="normal">Normal</option>
                    </select>
                    {u.id !== me.id && <button className="btn ghost sm">Ubah</button>}
                  </form>
                </td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-xl text-sm text-muted">
        Pengguna baru dibuat di Supabase → Authentication → Add user (pendaftaran publik tidak tersedia). Mereka masuk sebagai Normal; ubah role di sini.
      </p>
    </>
  );
}
