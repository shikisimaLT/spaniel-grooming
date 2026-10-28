import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-rule p-12 lg:flex">
        <p className="eyebrow">Buku besar · Est. 2026</p>
        <div>
          <h1 className="figure text-[5.5rem] leading-[0.92]">
            Spaniel
            <br />
            Grooming
          </h1>
          <p className="mt-6 max-w-sm text-muted">
            Transaksi harian, komisi groomer, gaji dan bagi hasil — dalam satu buku, bukan lima tab Excel.
          </p>
        </div>
        <p className="eyebrow">Khusus tim internal</p>
      </section>
      <section className="flex items-center p-6 sm:p-12">
        <form action={signIn} className="rise mx-auto w-full max-w-sm space-y-5">
          <h2>Masuk</h2>
          <label className="field">
            <span>Email</span>
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && <p className="text-sm text-danger" role="alert">Email atau password salah.</p>}
          <button className="btn w-full justify-center" type="submit">Buka buku</button>
        </form>
      </section>
    </main>
  );
}
