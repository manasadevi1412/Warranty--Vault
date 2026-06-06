import { connectMongo } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Warranty } from "@/models/Warranty";
import { FiBell, FiBellOff, FiSmartphone } from "react-icons/fi";

type UserRow = {
  _id: unknown;
  email: string;
  name?: string;
  image?: string;
  fcmTokens?: string[];
  remindersEnabled?: boolean;
  createdAt?: Date;
};

export default async function AdminUsersPage() {
  await connectMongo();
  const users = await User.find({}).sort({ createdAt: -1 }).lean<UserRow[]>();

  const counts = await Warranty.aggregate<{ _id: string; total: number; expired: number }>([
    {
      $group: {
        _id: "$userEmail",
        total: { $sum: 1 },
        expired: {
          $sum: { $cond: [{ $lt: ["$expiryDate", new Date()] }, 1, 0] },
        },
      },
    },
  ]);
  const countMap = new Map(counts.map((c) => [c._id, c]));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <div className="folio mb-2">Console · Users</div>
          <h1 className="display text-4xl sm:text-5xl">
            All <span className="display-italic text-accent">subscribers.</span>
          </h1>
        </div>
        <div className="folio">{users.length} total</div>
      </header>

      {users.length === 0 ? (
        <div className="sheet py-16 text-center serif text-ink-3">No users yet.</div>
      ) : (
        <div className="sheet overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-rule">
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Warranties</Th>
                <Th>Expired</Th>
                <Th>Push</Th>
                <Th>Reminders</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const c = countMap.get(u.email);
                const tokenCount = u.fcmTokens?.length ?? 0;
                return (
                  <tr key={String(u._id)} className="border-b border-rule last:border-b-0 hover:bg-paper-3/40">
                    <Td>
                      <div className="flex items-center gap-3">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-paper-3 border border-rule" />
                        )}
                        <div className="serif text-ink truncate max-w-[180px]">{u.name || "—"}</div>
                      </div>
                    </Td>
                    <Td><span className="mono text-xs text-ink-2 break-all">{u.email}</span></Td>
                    <Td><span className="mono">{c?.total ?? 0}</span></Td>
                    <Td>
                      <span className={`mono ${c?.expired ? "text-oxblood" : "text-ink-3"}`}>
                        {c?.expired ?? 0}
                      </span>
                    </Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 ${tokenCount > 0 ? "text-olive" : "text-ink-3"}`}>
                        <FiSmartphone size={13} />
                        <span className="mono">{tokenCount}</span>
                      </span>
                    </Td>
                    <Td>
                      {u.remindersEnabled !== false ? (
                        <span className="text-olive inline-flex items-center gap-1"><FiBell size={13} /> on</span>
                      ) : (
                        <span className="text-ink-3 inline-flex items-center gap-1"><FiBellOff size={13} /> off</span>
                      )}
                    </Td>
                    <Td>
                      <span className="folio">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
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
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="eyebrow-sm py-3 px-4 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-3 px-4 align-middle">{children}</td>;
}
