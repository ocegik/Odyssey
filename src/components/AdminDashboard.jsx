import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { buildAdminMetrics, startOfWeek } from "../lib/adminMetrics";
import { COLORS, SHADOW, TYPE } from "../constants";
import StatCard from "./ui/StatCard";
import CollegeTargetsPanel from "./CollegeTargetsPanel";

const columns = [
  { key: "email", label: "Email" },
  { key: "signupDate", label: "Signup date" },
  { key: "mockCount", label: "Mock count", numeric: true },
  { key: "lastMockDate", label: "Last mock date" },
];

function displayDate(value, withYear = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

function sortValue(value) {
  if (value === null || value === undefined) return "";
  return typeof value === "number" ? value : String(value).toLowerCase();
}

function SortIcon({ active, direction }) {
  if (!active) return <ArrowUpDown size={13} aria-hidden="true" />;
  return direction === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />;
}

export default function AdminDashboard() {
  const [state, setState] = useState({ status: "loading", profiles: [], mocks: [], error: "" });
  const [sort, setSort] = useState({ key: "signupDate", direction: "desc" });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        if (active) setState({ status: "error", profiles: [], mocks: [], error: "Supabase is not configured." });
        return;
      }

      const [profilesResult, mocksResult] = await Promise.all([
        supabase.from("profiles").select("id, email, created_at"),
        supabase.from("mocks").select("user_id, mock_date, created_at"),
      ]);
      if (!active) return;
      const error = profilesResult.error || mocksResult.error;
      if (error) {
        setState({ status: "error", profiles: [], mocks: [], error: error.message || "Could not load dashboard data." });
        return;
      }
      setState({ status: "ready", profiles: profilesResult.data || [], mocks: mocksResult.data || [], error: "" });
    }
    load();
    return () => { active = false; };
  }, []);

  const { users, stats } = useMemo(
    () => buildAdminMetrics(state.profiles, state.mocks),
    [state.profiles, state.mocks],
  );
  const sortedUsers = useMemo(() => [...users].sort((left, right) => {
    const a = sortValue(left[sort.key]);
    const b = sortValue(right[sort.key]);
    if (a === b) return 0;
    const result = a > b ? 1 : -1;
    return sort.direction === "asc" ? result : -result;
  }), [users, sort]);

  const changeSort = (key) => setSort((current) => (
    current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: key === "email" ? "asc" : "desc" }
  ));

  return (
    <main className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <div className="flex items-center gap-2" style={{ color: COLORS.primary }}>
          <ShieldCheck size={20} aria-hidden="true" />
          <span style={TYPE.label}>Restricted view</span>
        </div>
        <h1 style={TYPE.pageTitle}>Admin dashboard</h1>
        <p className="text-sm" style={{ color: COLORS.inkMuted }}>
          Account-level usage counts only. Individual mock, section, and analysis content is not available here.
        </p>
      </section>

      {state.status === "loading" && <p className="text-sm" style={{ color: COLORS.inkMuted }}>Loading dashboard…</p>}
      {state.status === "error" && <p className="text-sm" role="alert" style={{ color: COLORS.danger }}>{state.error}</p>}

      {state.status === "ready" && <>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-label="Aggregate statistics">
          <StatCard label="Total users" value={stats.totalUsers} />
          <StatCard label="New this week" value={stats.newThisWeek} sub={`Since ${displayDate(startOfWeek(new Date()), false)}`} accent={COLORS.info} />
          <StatCard label="New this month" value={stats.newThisMonth} accent={COLORS.info} />
          <StatCard label="Total mocks logged" value={stats.totalMocks} />
          <StatCard label="Active users" value={stats.activeUsers} sub="Logged a mock in the last 7 days" accent={COLORS.good} />
          <StatCard label="Users with zero mocks" value={stats.usersWithNoMocks} accent={COLORS.warn} />
        </section>

        <section className="overflow-hidden" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: SHADOW.card }}>
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <h2 style={TYPE.panelTitle}>Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 620 }}>
              <thead style={{ background: COLORS.surface2 }}>
                <tr>
                  {columns.map((column) => {
                    const active = sort.key === column.key;
                    return <th key={column.key} className={`px-4 py-3 ${column.numeric ? "text-right" : "text-left"}`} scope="col">
                      <button type="button" onClick={() => changeSort(column.key)} className={`inline-flex items-center gap-1.5 ${column.numeric ? "ml-auto" : ""}`} style={{ ...TYPE.label, color: active ? COLORS.ink : COLORS.inkMuted }}>
                        {column.label}<SortIcon active={active} direction={sort.direction} />
                      </button>
                    </th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => <tr key={user.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td className="px-4 py-3" style={{ color: COLORS.ink }}>{user.email}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.inkMuted }}>{displayDate(user.signupDate)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{user.mockCount}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.inkMuted }}>{displayDate(user.lastMockDate)}</td>
                </tr>)}
                {!sortedUsers.length && <tr><td className="px-4 py-8 text-center" colSpan={4} style={{ color: COLORS.inkMuted }}>No user profiles found.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label="College target reference">
          <CollegeTargetsPanel />
        </section>
      </>}
    </main>
  );
}
