import Link from "next/link";
import { getProfile, isStaff } from "@/lib/auth";
import { signOut } from "../login/actions";

const roleLabel = { owner: "Owner", admin: "Admin", normal: "Normal" } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getProfile();
  const staff = isStaff(me.role);
  const groups: { title: string; items: { href: string; label: string }[] }[] = [
    ...(staff ? [{ title: "Ringkasan", items: [{ href: "/back-office", label: "Dashboard" }] }] : []),
    {
      title: "Harian",
      items: [{ href: "/back-office/transactions", label: "Transaksi" }, ...(staff ? [{ href: "/back-office/expenses", label: "Expense" }] : [])],
    },
    ...(staff
      ? [
          {
            title: "Master",
            items: [
              { href: "/back-office/master/customers", label: "Customer" },
              { href: "/back-office/master/groomers", label: "Groomer" },
              { href: "/back-office/master/products", label: "Produk & Harga" },
            ],
          },
          {
            title: "Analisa",
            items: [
              { href: "/back-office/analysis/salary", label: "Gaji" },
              ...(me.role === "owner" ? [{ href: "/back-office/analysis/bod", label: "BOD" }] : []),
              { href: "/back-office/analysis/growth", label: "Growth" },
            ],
          },
        ]
      : []),
    ...(staff ? [{ title: "Website", items: [{ href: "/", label: "Landing Page ↗" }] }] : []),
    ...(me.role === "owner" ? [{ title: "Sistem", items: [{ href: "/back-office/settings/users", label: "Pengguna" }] }] : []),
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-rule px-4 pt-3 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <Link href={staff ? "/back-office" : "/back-office/transactions"} className="figure text-xl font-semibold leading-none lg:block lg:text-2xl">
            Spaniel<br className="hidden lg:block" /> Grooming
          </Link>
          <form action={signOut} className="text-right text-xs lg:hidden">
            <span className="font-semibold">{me.name}</span> · <span className="text-muted">{roleLabel[me.role]}</span>
            <button className="ml-2 inline-block py-2 underline" type="submit">Keluar</button>
          </form>
        </div>
        <nav aria-label="Menu utama" className="-mx-4 mt-2 flex gap-5 overflow-x-auto px-4 lg:mx-0 lg:mt-6 lg:block lg:space-y-6 lg:overflow-visible lg:px-0">
          {groups.map((g) => (
            <div key={g.title} className="flex shrink-0 items-center gap-3 lg:block">
              <p className="eyebrow hidden lg:mb-1 lg:block">{g.title}</p>
              <ul className="flex gap-4 lg:block">
                {g.items.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} target={i.href === "/" ? "_blank" : undefined} className="block whitespace-nowrap py-2.5 hover:text-chestnut hover:underline lg:py-0.5">
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <form action={signOut} className="mt-6 hidden border-t border-rule pt-4 text-sm lg:block">
          <p className="font-semibold">{me.name}</p>
          <p className="text-muted">{roleLabel[me.role]}</p>
          <button className="mt-2 underline hover:text-chestnut" type="submit">Keluar</button>
        </form>
      </aside>
      <main className="min-w-0 p-5 sm:p-8">{children}</main>
    </div>
  );
}
