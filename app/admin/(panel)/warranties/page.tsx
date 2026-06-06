import Link from "next/link";
import { connectMongo } from "@/lib/mongodb";
import { Warranty } from "@/models/Warranty";

type Status = "all" | "active" | "expiring" | "expired";

type WarrantyRow = {
  _id: unknown;
  userEmail: string;
  productName?: string;
  companyName?: string;
  companyPhone?: string;
  serialNumber?: string;
  expiryDate: Date;
  purchaseDate?: Date;
  remindersEnabled?: boolean;
  imageUrl?: string;
  createdAt?: Date;
};

const PAGE_SIZE = 50;

export default async function AdminWarrantiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const status: Status = (["active", "expiring", "expired", "all"] as const).includes(
    params.status as Status
  )
    ? (params.status as Status)
    : "all";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  await connectMongo();

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const filter: Record<string, unknown> = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { userEmail: rx },
      { productName: rx },
      { companyName: rx },
      { serialNumber: rx },
    ];
  }
  if (status === "active") filter.expiryDate = { $gte: now };
  else if (status === "expiring") filter.expiryDate = { $gte: now, $lte: in30 };
  else if (status === "expired") filter.expiryDate = { $lt: now };

  const [total, rows] = await Promise.all([
    Warranty.countDocuments(filter),
    Warranty.find(filter)
      .sort({ expiryDate: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean<WarrantyRow[]>(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseHref = (next: Partial<{ q: string; status: string; page: number }>) => {
    const sp = new URLSearchParams();
    const _q = next.q ?? q;
    const _status = next.status ?? status;
    const _page = next.page ?? page;
    if (_q) sp.set("q", _q);
    if (_status && _status !== "all") sp.set("status", _status);
    if (_page > 1) sp.set("page", String(_page));
    const s = sp.toString();
    return s ? `/admin/warranties?${s}` : "/admin/warranties";
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <div className="folio mb-2">Console · Warranties</div>
          <h1 className="display text-4xl sm:text-5xl">
            Every <span className="display-italic text-accent">record.</span>
          </h1>
        </div>
        <div className="folio">{total} match{total === 1 ? "" : "es"}</div>
      </header>

      <form className="flex flex-col sm:flex-row gap-3 items-start sm:items-center" action="/admin/warranties" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search email, brand, product, serial…"
          className="field w-full sm:max-w-sm"
        />
        <select name="status" defaultValue={status} className="field w-full sm:w-auto">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring · 30d</option>
          <option value="expired">Expired</option>
        </select>
        <button type="submit" className="btn btn-ink">Search</button>
        {(q || status !== "all") && (
          <Link href="/admin/warranties" className="link text-sm">Reset</Link>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="sheet py-16 text-center serif text-ink-3">No warranties match.</div>
      ) : (
        <div className="sheet overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-rule">
                <Th>Owner</Th>
                <Th>Brand</Th>
                <Th>Product</Th>
                <Th>Serial</Th>
                <Th>Expires</Th>
                <Th>Status</Th>
                <Th>Added</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const days = Math.ceil((new Date(w.expiryDate).getTime() - now.getTime()) / 86_400_000);
                return (
                  <tr key={String(w._id)} className="border-b border-rule last:border-b-0 hover:bg-paper-3/40">
                    <Td><span className="mono text-xs text-ink-2 break-all">{w.userEmail}</span></Td>
                    <Td><span className="text-ink truncate inline-block max-w-[160px]">{w.companyName || "—"}</span></Td>
                    <Td><span className="serif text-ink truncate inline-block max-w-[200px]">{w.productName || "—"}</span></Td>
                    <Td><span className="mono text-xs text-ink-3 truncate inline-block max-w-[140px]">{w.serialNumber || "—"}</span></Td>
                    <Td>
                      <span className="mono">
                        {new Date(w.expiryDate).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </Td>
                    <Td>
                      <span className={`mono text-xs ${days < 0 ? "text-oxblood" : days <= 30 ? "text-ochre" : "text-olive"}`}>
                        {days < 0 ? `Lapsed · ${Math.abs(days)}d` : days <= 30 ? `Soon · ${days}d` : `${days}d`}
                      </span>
                    </Td>
                    <Td>
                      <span className="folio">
                        {w.createdAt
                          ? new Date(w.createdAt).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "2-digit",
                            })
                          : "—"}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Link
            href={baseHref({ page: Math.max(1, page - 1) })}
            className={`eyebrow ${page === 1 ? "text-ink-3 pointer-events-none" : "text-ink hover:text-accent"}`}
            aria-disabled={page === 1}
          >
            ← Prev
          </Link>
          <div className="folio">Page {page} of {totalPages}</div>
          <Link
            href={baseHref({ page: Math.min(totalPages, page + 1) })}
            className={`eyebrow ${page === totalPages ? "text-ink-3 pointer-events-none" : "text-ink hover:text-accent"}`}
            aria-disabled={page === totalPages}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="eyebrow-sm py-3 px-4 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-3 px-4 align-middle whitespace-nowrap">{children}</td>;
}
