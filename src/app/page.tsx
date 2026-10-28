import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { rp } from "@/lib/format";

export const metadata: Metadata = {
  title: "Spaniel Grooming — Grooming anjing panggilan",
  description: "Groomer datang ke rumah atau apartemenmu. Daftar harga jelas, booking lewat WhatsApp.",
};

// Harga & area diambil dari database lewat fungsi publik; halaman dibangun ulang tiap 5 menit.
export const revalidate = 300;

const WA_NUMBER = "6281318862161";
const WA_DISPLAY = "+62 813-1886-2161";
const WA_TEXT = "Halo Spaniel Grooming, saya mau booking grooming untuk anjing saya.";
const wa = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`;

type Item = { code: string; name: string; price: number };

const STEPS = [
  { n: "01", t: "Pilih paket & hari", d: "Kirim ukuran dan jenis bulu anjingmu lewat WhatsApp. Kami balas dengan paket yang pas dan jadwal terdekat." },
  { n: "02", t: "Groomer datang", d: "Satu groomer datang ke rumah atau apartemenmu membawa perlengkapan sendiri. Kamu tidak perlu antar-jemput." },
  { n: "03", t: "Terima bukti selesai", d: "Setelah rapi, kamu terima bukti selesai dan rincian tagihan yang sama dengan harga di halaman ini." },
];

async function loadLanding(): Promise<{ items: Item[]; areas: string[] }> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const { data, error } = await supabase.rpc("landing_data");
    if (error || !data) return { items: [], areas: [] };
    const d = data as { items: { code: string; name: string; price: number }[]; areas: string[] };
    return {
      items: d.items.map((i) => ({ code: i.code, name: i.name, price: Number(i.price) })),
      areas: d.areas.map((a) => (a.length <= 4 ? a.toUpperCase() : a)),
    };
  } catch {
    return { items: [], areas: [] };
  }
}

export default async function LandingPage() {
  const { items, areas } = await loadLanding();
  const packages = items.filter((i) => i.code.startsWith("P"));
  const extras = items.filter((i) => !i.code.startsWith("P"));
  const sample = packages.find((p) => p.code === "P002") ?? packages[0];
  const from = packages.length ? Math.min(...packages.map((p) => p.price)) : null;

  return (
    <div className="lp">
      <header className="lp-wrap flex items-center justify-between gap-4 py-5">
        <a href="#top" className="figure text-xl font-semibold leading-none sm:text-2xl">Spaniel Grooming</a>
        <nav aria-label="Navigasi halaman" className="hidden gap-7 text-sm font-semibold sm:flex">
          <a href="#cara" className="hover:text-chestnut">Cara kerja</a>
          <a href="#harga" className="hover:text-chestnut">Harga</a>
          <a href="#area" className="hover:text-chestnut">Area</a>
        </nav>
        <a href={wa} className="btn sm">Booking</a>
      </header>

      <main id="top">
        {/* HERO: oversized headline against an appointment card */}
        <section className="lp-wrap grid items-end gap-10 pb-16 pt-6 lg:grid-cols-[1.35fr_1fr] lg:pb-24 lg:pt-14">
          <div>
            <p className="eyebrow rise">Grooming anjing panggilan{areas.length ? ` · ${areas.slice(0, 3).join(", ")} & sekitarnya` : ""}</p>
            <h1 className="lp-h1 rise" style={{ animationDelay: ".08s" }}>
              Kami yang <em>datang.</em>
              <br />
              Dia yang <em>wangi.</em>
            </h1>
            <p className="rise mt-6 max-w-md text-lg text-muted" style={{ animationDelay: ".18s" }}>
              Groomer kami datang ke rumah atau apartemenmu. Mandi, sisir, rapikan bulu — anjingmu tidak perlu stres di jalan.
            </p>
            <div className="rise mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: ".28s" }}>
              <a href={wa} className="btn">Booking lewat WhatsApp</a>
              <a href="#harga" className="underline underline-offset-4 hover:text-chestnut">Lihat daftar harga{from ? ` (mulai ${rp(from)})` : ""}</a>
            </div>
          </div>

          <aside className="lp-card rise" style={{ animationDelay: ".22s" }} aria-label="Contoh kartu janji">
            <p className="eyebrow">Kartu janji · contoh</p>
            <dl className="mt-4 space-y-3">
              <div className="lp-row"><dt>Nama anjing</dt><dd className="figure text-xl">Momo</dd></div>
              <div className="lp-row"><dt>Paket</dt><dd className="text-right">{sample ? sample.name.trim() : "—"}</dd></div>
              <div className="lp-row"><dt>Tempat</dt><dd>Rumah / apartemen</dd></div>
              <div className="lp-row"><dt>Harga paket</dt><dd className="figure text-xl">{sample ? rp(sample.price) : "—"}</dd></div>
            </dl>
            <p className="mt-5 border-t border-dashed border-rule pt-3 text-xs text-muted">Add-on dipilih belakangan sesuai kondisi bulu, dan ditulis jelas di tagihan.</p>
          </aside>
        </section>

        {/* CARA KERJA: numbered rows, not cards */}
        <section id="cara" className="lp-band">
          <div className="lp-wrap py-16 lg:py-20">
            <h2 className="lp-h2">Tiga langkah, tanpa antar-jemput.</h2>
            <ol className="mt-10">
              {STEPS.map((s) => (
                <li key={s.n} className="grid gap-2 border-t border-ink py-6 sm:grid-cols-[6rem_1fr_1.4fr] sm:items-baseline sm:gap-8">
                  <span className="figure text-5xl text-chestnut">{s.n}</span>
                  <h3 className="text-xl">{s.t}</h3>
                  <p className="text-muted">{s.d}</p>
                </li>
              ))}
              <li className="border-t border-ink" />
            </ol>
          </div>
        </section>

        {/* HARGA: printed-menu price list with dotted leaders */}
        <section id="harga" className="lp-wrap py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <p className="eyebrow">Daftar harga</p>
              <h2 className="lp-h2 mt-2">Harganya tertulis. Tidak ada tebak-tebakan.</h2>
              <p className="mt-4 max-w-sm text-muted">
                Pilih paket sesuai ukuran dan jenis bulu. Kondisi bulu sangat kusut atau ukuran di luar daftar akan kami konfirmasi dulu sebelum mulai.
              </p>
            </div>
            <div className="space-y-10">
              <PriceList title="Paket mandi & grooming" rows={packages} />
              <PriceList title="Layanan tambahan" rows={extras} />
              {items.length === 0 && <p className="text-muted">Daftar harga sedang diperbarui. Tanyakan langsung lewat WhatsApp.</p>}
            </div>
          </div>
        </section>

        {/* AREA: typographic list */}
        {areas.length > 0 && (
          <section id="area" className="lp-band">
            <div className="lp-wrap py-16 lg:py-20">
              <p className="eyebrow">Area layanan</p>
              <p className="lp-area mt-4">
                {areas.map((a, i) => (
                  <span key={a}>{a}{i < areas.length - 1 && <span className="text-chestnut"> / </span>}</span>
                ))}
                <span className="text-muted"> …dan sekitarnya.</span>
              </p>
              <p className="mt-4 max-w-lg text-muted">Area lain? Tanya saja lewat WhatsApp — jadwal dan ongkos kunjungan kami konfirmasi sebelum booking.</p>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="lp-wrap py-16 lg:py-24">
          <div className="lp-cta">
            <h2 className="lp-h2 max-w-xl">Anjingmu sudah waktunya wangi lagi?</h2>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a href={wa} className="btn lp-btn-inv">Chat {WA_DISPLAY}</a>
              <span className="text-sm opacity-80">Sebutkan ukuran &amp; jenis bulu anjingmu, kami balas dengan paket dan jadwal.</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-wrap flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-rule py-6 text-sm text-muted">
        <span><span className="figure text-ink">Spaniel Grooming</span> · WhatsApp {WA_DISPLAY}</span>
        <span>© {new Date().getFullYear()} · <Link href="/back-office" className="underline hover:text-chestnut">Staff login</Link></span>
      </footer>
    </div>
  );
}

function PriceList({ title, rows }: { title: string; rows: Item[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="lp-h3">{title}</h3>
      <ul className="mt-3">
        {rows.map((r) => (
          <li key={r.code} className="lp-price">
            <span>{r.name.trim()}</span>
            <i aria-hidden />
            <b className="figure">{rp(r.price)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
