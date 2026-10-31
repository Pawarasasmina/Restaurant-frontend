import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  QrCode,
  Settings,
  Tags,
  Table2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { api, formatMoney } from "../services/api";
import type { Order } from "../types";
import { Badge, Button, Card, Empty, Input, Loading } from "../components/ui";
type User = { id: string; name: string; email: string; role: string };
type Bill = {
  _id: string;
  tableSession: string;
  total: number;
  paid: number;
  refunded: number;
  status: string;
};
const nav = [
  ["Dashboard", "/admin", LayoutDashboard],
  ["Orders", "/admin/orders", ClipboardList],
  ["Kitchen", "/staff/kitchen", ChefHat],
  ["Menu", "/admin/menu", BookOpen],
  ["Categories", "/admin/categories", Tags],
  ["Tables & QR", "/admin/tables", QrCode],
  ["Reservations", "/admin/reservations", CalendarDays],
  ["Staff", "/admin/staff", Users],
  ["Analytics", "/admin/analytics", BarChart3],
  ["Settings", "/admin/settings", Settings],
] as const;
export function Login() {
  const { register, handleSubmit } = useForm<{
    email: string;
    password: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation<
    { user: User },
    Error,
    { email: string; password: string }
  >({
    mutationFn: (v) => api.post("/auth/login", v),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      navigate("/admin", { replace: true });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <main className="grid min-h-screen place-items-center bg-ink p-5">
      <Card className="w-full max-w-sm p-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-clay">
          Staff portal
        </p>
        <h1 className="mt-3 font-serif text-4xl">Welcome back.</h1>
        <form
          className="mt-7 grid gap-4"
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
        >
          <Input
            type="email"
            placeholder="Email"
            {...register("email", { required: true })}
          />
          <Input
            type="password"
            placeholder="Password"
            {...register("password", { required: true })}
          />
          <Button disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in…" : "Sign in securely"}
          </Button>
        </form>
        <p className="mt-5 text-xs leading-5 text-ink/50">
          There is no public registration. The first owner uses the secure setup
          endpoint; owners then invite staff.
        </p>
      </Card>
    </main>
  );
}
export function AdminLayout() {
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const me = useQuery<{ user: User }>({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me"),
    retry: false,
  });
  if (me.isLoading) return <Loading />;
  if (me.error) return <Navigate to="/staff/login" replace />;
  const currentPage =
    nav.find(([, to]) => to === location.pathname)?.[0] || "Operations";
  return (
    <div className="min-h-screen bg-[#f4f3ef] pb-20 md:pb-0">
      {mobile && (
        <button
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col bg-ink p-5 text-white shadow-2xl transition-transform duration-200 md:w-64 md:translate-x-0 md:shadow-none ${mobile ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Link to="/admin" className="font-serif text-xl">
            Saffron & Stone
          </Link>
          <button className="md:hidden" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <div className="mt-6 rounded-2xl bg-white/[.06] p-3">
          <p className="truncate text-sm font-semibold">{me.data?.user.name}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-white/45">
              {me.data?.user.email}
            </p>
            <Badge>{me.data?.user.role}</Badge>
          </div>
        </div>
        <nav className="mt-6 grid flex-1 gap-1 overflow-y-auto pr-1">
          {nav
            .filter(
              ([label]) =>
                !(
                  me.data?.user.role === "chef" &&
                  !["Kitchen", "Orders"].includes(label)
                ),
            )
            .map(([label, to, Icon]) => (
              <NavLink
                end={to === "/admin"}
                onClick={() => setMobile(false)}
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive ? "bg-white text-ink" : "text-white/65 hover:bg-white/10 hover:text-white"}`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="mt-4 border-t border-white/10 pt-4">
          <button
            onClick={async () => {
              await api.post("/auth/logout");
              navigate("/staff/login");
            }}
            className="mt-3 flex items-center gap-2 text-sm text-white/60"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/[.06] bg-white/95 px-4 backdrop-blur md:h-20 md:px-8">
          <button
            aria-label="Open navigation"
            className="rounded-xl bg-black/5 p-2 md:hidden"
            onClick={() => setMobile(true)}
          >
            <MenuIcon />
          </button>
          <div className="min-w-0 flex-1 px-3 md:px-0">
            <p className="text-xs text-ink/40">Workspace</p>
            <h1 className="truncate text-base font-semibold md:text-lg">
              {currentPage}
            </h1>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{me.data?.user.name}</p>
            <p className="text-xs capitalize text-ink/40">
              {me.data?.user.role}
            </p>
          </div>
          <button
            aria-label="Notifications"
            className="ml-3 rounded-full bg-black/5 p-2.5"
          >
            <Bell size={19} />
          </button>
        </header>
        <main className="px-4 py-5 sm:px-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1500px]">
            <Outlet context={{ user: me.data?.user }} />
          </div>
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-black/10 bg-white/95 px-2 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        {nav.slice(0, 4).map(([label, to, Icon]) => (
          <NavLink
            end={to === "/admin"}
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold ${isActive ? "bg-clay/10 text-clay" : "text-ink/45"}`
            }
          >
            <Icon size={19} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export function Dashboard() {
  const orders = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => api.get("/orders"),
  });
  const tables = useQuery<any[]>({
    queryKey: ["tables"],
    queryFn: () => api.get("/tables"),
  });
  const reservations = useQuery<any[]>({
    queryKey: ["reservations"],
    queryFn: () => api.get("/reservations"),
  });
  const calls = useQuery<any[]>({
    queryKey: ["calls"],
    queryFn: () => api.get("/waiter-calls"),
  });
  const active =
    orders.data?.filter(
      (o) => !["completed", "cancelled", "rejected"].includes(o.status),
    ) || [];
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active orders", active.length, ClipboardList],
          [
            "Occupied tables",
            tables.data?.filter((t) => t.state === "occupied").length || 0,
            Table2,
          ],
          [
            "Today’s bookings",
            reservations.data?.filter(
              (r) =>
                new Date(r.date).toDateString() === new Date().toDateString(),
            ).length || 0,
            CalendarDays,
          ],
          ["Open calls", calls.data?.length || 0, Bell],
        ].map(([label, value, Icon]: any) => (
          <Card className="p-5" key={label}>
            <div className="flex justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-clay/10 text-clay">
                <Icon size={20} />
              </span>
              <span className="font-serif text-4xl">{value}</span>
            </div>
            <p className="mt-5 text-sm text-ink/55">{label}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Live order queue</h2>
            <Link
              className="text-sm font-semibold text-clay"
              to="/admin/orders"
            >
              View all
            </Link>
          </div>
          <OrderList orders={active.slice(0, 6)} />
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-2xl">Service requests</h2>
          <div className="mt-4 grid gap-3">
            {calls.data?.map((c) => (
              <div
                key={c._id}
                className={`rounded-xl p-4 ${c.type === "urgent" ? "bg-red-50" : "bg-black/[.03]"}`}
              >
                <div className="flex justify-between">
                  <b>Table {c.table?.number}</b>
                  <Badge tone={c.type === "urgent" ? "bad" : "warn"}>
                    {c.type}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-ink/50">
                  {new Date(c.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
            {!calls.data?.length && (
              <p className="py-8 text-center text-sm text-ink/40">
                No open requests
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
function OrderList({ orders = [] }: { orders?: Order[] }) {
  const qc = useQueryClient();
  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
    onError: (e) => toast.error(e.message),
  });
  const next: Record<string, string> = {
    pending: "accepted",
    accepted: "preparing",
    preparing: "ready",
    ready: "served",
    served: "completed",
  };
  if (!orders.length)
    return (
      <div className="mt-4">
        <Empty
          title="Queue is clear"
          body="New orders will appear here instantly."
        />
      </div>
    );
  return (
    <div className="mt-4 grid gap-3">
      {orders.map((o) => {
        const finished = ["completed", "rejected", "cancelled"].includes(
          o.status,
        );
        return (
          <div
            key={o._id}
            className={`rounded-xl border p-4 transition ${finished ? "border-slate-200 bg-slate-200/70 text-slate-500" : "border-black/[.07] bg-white"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <b>{o.orderNumber}</b>
                  <Badge
                    tone={
                      o.status === "completed"
                        ? "neutral"
                        : ["rejected", "cancelled"].includes(o.status)
                          ? "bad"
                          : "warn"
                    }
                  >
                    {o.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-ink/55">
                  {o.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
                </p>
                {o.items.some((i) => i.extras?.length) && (
                  <p className="mt-1 text-xs text-clay">
                    Modifiers included — open order for detail
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatMoney(o.total)}</p>
                {next[o.status] && (
                  <Button
                    className="mt-2 !px-3 !py-1.5"
                    onClick={() =>
                      move.mutate({ id: o._id, status: next[o.status] })
                    }
                  >
                    Mark {next[o.status]}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TableGroupedOrders({
  orders = [],
  bills = [],
}: {
  orders?: Order[];
  bills?: Bill[];
}) {
  const qc = useQueryClient();
  const payBill = useMutation({
    mutationFn: async (tableSessionId: string) => {
      const bill: Bill = await api.post("/bills", { tableSessionId });
      const outstanding = bill.total - bill.paid + bill.refunded;
      if (outstanding > 0)
        await api.post(`/bills/${bill._id}/payments`, {
          amount: outstanding,
          method: "manual",
          reference: "Marked paid from table orders",
        });
      return bill;
    },
    onSuccess: () => {
      toast.success("Table bill marked as paid");
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const groups = orders.reduce<Record<string, Order[]>>((result, order) => {
    const tableNumber = order.table?.number || "Unassigned";
    const groupKey = `${tableNumber}::${order.tableSession || "unknown"}`;
    (result[groupKey] ||= []).push(order);
    return result;
  }, {});
  const entries = Object.entries(groups).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  if (!entries.length)
    return (
      <Empty
        title="No table orders"
        body="New customer orders will appear here by table."
      />
    );
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {entries.map(([groupKey, tableOrders]) => {
        const tableNumber = groupKey.split("::")[0];
        const sorted = [...tableOrders].sort(
          (a, b) =>
            Number(["completed", "rejected", "cancelled"].includes(a.status)) -
              Number(
                ["completed", "rejected", "cancelled"].includes(b.status),
              ) ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const activeCount = sorted.filter(
          (order) =>
            !["completed", "rejected", "cancelled"].includes(order.status),
        ).length;
        const total = sorted
          .filter((order) => !["rejected", "cancelled"].includes(order.status))
          .reduce((sum, order) => sum + order.total, 0);
        const billableOrders = sorted.filter(
          (order) => !["rejected", "cancelled"].includes(order.status),
        );
        const allCompleted =
          billableOrders.length > 0 &&
          billableOrders.every((order) => order.status === "completed");
        const tableSessionId = billableOrders[0]?.tableSession;
        const paid = bills.some(
          (bill) =>
            String(bill.tableSession) === String(tableSessionId) &&
            bill.status === "settled",
        );
        return (
          <Card
            className={`overflow-hidden p-0 transition ${paid ? "bg-slate-200 opacity-70 grayscale" : ""}`}
            key={groupKey}
            aria-disabled={paid}
          >
            <div
              className={`flex items-center justify-between border-b px-5 py-4 text-white ${paid ? "bg-slate-600" : "bg-ink"}`}
            >
              <div>
                <p className="text-xs uppercase tracking-[.16em] text-white/50">
                  Table
                </p>
                <h3 className="font-serif text-3xl">{tableNumber}</h3>
              </div>
              <div className="text-right">
                <Badge tone={paid ? "neutral" : activeCount ? "warn" : "good"}>
                  {paid
                    ? "Paid · locked"
                    : activeCount
                      ? `${activeCount} active`
                      : "All completed"}
                </Badge>
                <p className="mt-2 text-sm text-white/65">
                  {formatMoney(total)}
                </p>
              </div>
            </div>
            <div
              className={`p-4 ${paid ? "pointer-events-none select-none" : ""}`}
            >
              <OrderList orders={sorted} />
            </div>
            {allCompleted && !paid && (
              <div className="border-t bg-emerald-50 p-4">
                <Button
                  className="w-full !bg-emerald-700"
                  disabled={payBill.isPending}
                  onClick={() =>
                    confirm(
                      `Mark the full bill for table ${tableNumber} as paid?`,
                    ) && payBill.mutate(tableSessionId)
                  }
                >
                  {payBill.isPending
                    ? "Recording payment…"
                    : "Mark full table bill paid"}
                </Button>
                <p className="mt-2 text-center text-xs text-emerald-900/60">
                  Available because every order for this table is completed.
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
export function Orders({ kitchen = false }: { kitchen?: boolean }) {
  const qc = useQueryClient();
  const orders = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => api.get("/orders"),
  });
  const bills = useQuery<Bill[]>({
    queryKey: ["bills"],
    queryFn: () => api.get("/bills"),
    enabled: !kitchen,
  });
  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:4000",
      { withCredentials: true },
    );
    socket.on("order:new", () => {
      toast.info("New order received");
      qc.invalidateQueries({ queryKey: ["orders"] });
    });
    socket.on("order:changed", () =>
      qc.invalidateQueries({ queryKey: ["orders"] }),
    );
    socket.on("connected", () =>
      qc.invalidateQueries({ queryKey: ["orders"] }),
    );
    return () => {
      socket.close();
    };
  }, [qc]);
  if (orders.isLoading || (!kitchen && bills.isLoading)) return <Loading />;
  const visibleOrders = kitchen
    ? orders.data?.filter((order) =>
        ["accepted", "preparing"].includes(order.status),
      )
    : orders.data;
  return (
    <div>
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-ink/50">Live updates · newest first</p>
          <h2 className="font-serif text-4xl">
            {kitchen ? "Kitchen display" : "All orders"}
          </h2>
        </div>
        <Badge tone="good">Connected</Badge>
      </div>
      <div className="mt-6">
        {kitchen ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <OrderList orders={visibleOrders} />
          </div>
        ) : (
          <TableGroupedOrders orders={visibleOrders} bills={bills.data} />
        )}
      </div>
    </div>
  );
}
export function GenericAdmin({ kind }: { kind: string }) {
  const endpoint = kind === "menu" ? "menu-items" : kind;
  const query = useQuery<any[]>({
    queryKey: [endpoint],
    queryFn: () => api.get(`/${endpoint}`),
  });
  if (query.isLoading) return <Loading />;
  const values = Array.isArray(query.data)
    ? query.data
    : (query.data as any)?.items || [];
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-ink/50">Manage restaurant operations</p>
          <h2 className="font-serif text-4xl capitalize">{kind}</h2>
        </div>
        <Button>New {kind.replace(/s$/, "")}</Button>
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="border-b p-4">
          <Input placeholder={`Search ${kind}…`} className="max-w-sm" />
        </div>
        {values.length ? (
          <div className="divide-y">
            {values.map((v: any) => (
              <div
                className="flex items-center justify-between p-4"
                key={v._id}
              >
                <div>
                  <p className="font-semibold">
                    {v.name ||
                      v.displayName ||
                      v.number ||
                      v.email ||
                      v.billNumber}
                  </p>
                  <p className="mt-1 text-xs text-ink/45">
                    {v.description || v.zone || v.phone || v.role || v.status}
                  </p>
                </div>
                <Badge tone={v.active === false ? "bad" : "neutral"}>
                  {v.status ||
                    v.state ||
                    (v.active === false ? "inactive" : "active")}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5">
            <Empty
              title={`No ${kind} yet`}
              body="Create the first record to get started."
            />
          </div>
        )}
      </Card>
    </div>
  );
}
export function Analytics() {
  const data = useQuery<any>({
    queryKey: ["analytics"],
    queryFn: () => api.get("/analytics"),
  });
  if (data.isLoading) return <Loading />;
  return (
    <div>
      <h2 className="font-serif text-4xl">Performance at a glance</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Net revenue", formatMoney(data.data?.revenue || 0)],
          ["Order volume", data.data?.orderVolume || 0],
          ["Average order", formatMoney(data.data?.averageOrderValue || 0)],
        ].map(([k, v]) => (
          <Card className="p-6" key={k}>
            <p className="text-sm text-ink/50">{k}</p>
            <p className="mt-3 font-serif text-4xl">{v}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-8">
        <h3 className="font-serif text-2xl">Reporting notes</h3>
        <p className="mt-2 text-sm text-ink/55">
          Revenue includes settled bills only and subtracts recorded refunds.
          Tax, discounts, and service charges remain separate server-owned
          fields.
        </p>
      </Card>
    </div>
  );
}
