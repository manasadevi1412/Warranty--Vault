import Link from "next/link";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Warranty } from "@/models/Warranty";
import { FiUsers, FiArchive, FiBell, FiAlertOctagon, FiClock } from "react-icons/fi";

export default async function AdminOverviewPage() {
  await connectMongo();

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    warrantyCount,
    expiringSoon,
    expired,
    pushSubs,
    recentUsers,
    recentWarranties,
  ] = await Promise.all([
    User.countDocuments({}),
    Warranty.countDocuments({}),
    Warranty.countDocuments({ expiryDate: { $gte: now, $lte: in30 } }),
    Warranty.countDocuments({ expiryDate: { $lt: now } }),
    User.countDocuments({ fcmTokens: { $exists: true, $not: { $size: 0 } } }),
    User.find({}).sort({ createdAt: -1 }).limit(5).lean<
      Array<{ _id: unknown; email: string; name?: string; image?: string; createdAt?: Date; fcmTokens?: string[] }>
    >(),
    Warranty.find({}).sort({ createdAt: -1 }).limit(5).lean<
      Array<{
        _id: unknown;
        userEmail: string;
        productName?: string;
        companyName?: string;
        expiryDate: Date;
        createdAt?: Date;
      }>
    >(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <div className="folio mb-2">Console · Overview</div>
        <h1 className="display text-4xl sm:text-5xl">
          The <span className="display-italic text-accent">archive</span> at a glance.
        </h1>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-rule border border-rule">
        <Stat label="Users" value={userCount} icon={<FiUsers />} />
        <Stat label="Warranties" value={warrantyCount} icon={<FiArchive />} accent />
        <Stat label="Expiring · 30d" value={expiringSoon} icon={<FiClock />} tone="ochre" />
        <Stat label="Expired" value={expired} icon={<FiAlertOctagon />} tone="oxblood" />
        <Stat label="Push enabled" value={pushSubs} icon={<FiBell />} tone="olive" />
      </section>

      <section className="grid lg:grid-cols-2 gap-10">
        <Panel
          title="Recent users"
          footer={<Link href="/admin/users" className="link">View all users →</Link>}
        >
          {recentUsers.length === 0 ? (
            <Empty label="No users yet" />
          ) : (
            <ul className="flex flex-col">
              {recentUsers.map((u) => (
                <li key={String(u._id)} className="py-3 border-t border-rule first:border-t-0 flex items-center gap-3">
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.image} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-paper-3 border border-rule" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink truncate">{u.name || u.email}</div>
                    <div className="folio truncate">{u.email}</div>
                  </div>
                  <div className="folio text-ink-3 shrink-0">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent warranties"
          footer={<Link href="/admin/warranties" className="link">View all warranties →</Link>}
        >
          {recentWarranties.length === 0 ? (
            <Empty label="No warranties yet" />
          ) : (
            <ul className="flex flex-col">
              {recentWarranties.map((w) => {
                const days = Math.ceil((new Date(w.expiryDate).getTime() - now.getTime()) / 86_400_000);
                return (
                  <li key={String(w._id)} className="py-3 border-t border-rule first:border-t-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-ink truncate">
                          {w.companyName || "—"} {w.productName ? `· ${w.productName}` : ""}
                        </div>
                        <div className="folio truncate">{w.userEmail}</div>
                      </div>
                      <div className={`mono text-xs shrink-0 ${days < 0 ? "text-oxblood" : days <= 30 ? "text-ochre" : "text-olive"}`}>
                        {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
  tone?: "olive" | "ochre" | "oxblood";
}) {
  const toneClass = tone === "olive" ? "text-olive" : tone === "ochre" ? "text-ochre" : tone === "oxblood" ? "text-oxblood" : accent ? "text-accent" : "";
  return (
    <div className="bg-paper-2 p-5">
      <div className="flex items-center justify-between">
        <div className="eyebrow-sm">{label}</div>
        <span className="text-ink-3">{icon}</span>
      </div>
      <div
        className={`display text-4xl sm:text-5xl mt-2 ${toneClass}`}
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
      >
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="sheet">
      <div className="px-5 py-4 border-b border-rule flex items-center justify-between">
        <div className="eyebrow">{title}</div>
      </div>
      <div className="px-5 py-3">{children}</div>
      {footer && <div className="px-5 py-3 border-t border-rule">{footer}</div>}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="py-6 text-center serif text-ink-3 text-sm">{label}</div>;
}
