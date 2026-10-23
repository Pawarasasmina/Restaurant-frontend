import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  Check,
  ChevronLeft,
  Clock,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { api, formatMoney } from "../services/api";
import { useCart, type CartLine } from "../stores/cart";
import type {
  MenuItem,
  Order,
  Option,
  Restaurant,
  TableSession,
} from "../types";
import { Badge, Button, Card, Empty, Loading } from "../components/ui";
const guestId = () => {
  let id = localStorage.getItem("guestId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("guestId", id);
  }
  return id;
};
export function TableEntry() {
  const { qrToken } = useParams();
  const nav = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const join = useMutation<TableSession>({
    mutationFn: () =>
      api.post("/table-sessions", {
        qrToken,
        guestId: guestId(),
        guestCount: 1,
      }),
    onSuccess: (d) => {
      if (d.session.status === "active") nav("/table/order", { replace: true });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <main className="grid min-h-screen place-items-center bg-ink p-5">
      <Card className="w-full max-w-md p-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-clay text-white">
          <UtensilsCrossed />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-clay">
          Dine-in ordering
        </p>
        <h1 className="mt-3 font-serif text-4xl">Welcome to your table</h1>
        <p className="mt-4 text-ink/60">
          Confirm you are physically at the table displaying this QR code. Your
          ordering access is temporary and tied to this visit.
        </p>
        <label className="mt-7 flex items-start gap-3 rounded-xl bg-black/[.04] p-4 text-left text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I’m at this table and ready to begin my dining session.</span>
        </label>
        <Button
          disabled={!confirmed || join.isPending}
          onClick={() => join.mutate()}
          className="mt-5 w-full"
        >
          {join.isPending ? "Verifying table…" : "Confirm & view menu"}
        </Button>
        {join.data?.session.status === "pending" && (
          <p className="mt-4 text-sm text-amber-700">
            A staff member needs to activate this table.
          </p>
        )}
      </Card>
    </main>
  );
}

export function CustomerOrder() {
  const qc = useQueryClient();
  const {
    lines,
    add,
    remove,
    setQuantity: setLineQuantity,
    clear,
    total,
    setSession,
  } = useCart();
  const [selected, setSelected] = useState<MenuItem>();
  const [quantity, setQuantity] = useState(1);
  const [variant, setVariant] = useState<Option>();
  const [extras, setExtras] = useState<Option[]>([]);
  const session = useQuery<TableSession>({
    queryKey: ["guest-session"],
    queryFn: () => api.get("/guest/session"),
  });
  const menu = useQuery<{ items: MenuItem[] }>({
    queryKey: ["menu"],
    queryFn: () => api.get("/public/menu?limit=100"),
  });
  const settings = useQuery<Restaurant>({
    queryKey: ["settings"],
    queryFn: () => api.get("/public/settings"),
  });
  const orders = useQuery<Order[]>({
    queryKey: ["guest-orders"],
    queryFn: () => api.get("/guest/orders"),
    enabled: !!session.data,
  });
  useEffect(() => {
    if (session.data) setSession(session.data.session.id);
  }, [session.data, setSession]);
  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:4000",
      { withCredentials: true },
    );
    socket.on("order:changed", () =>
      qc.invalidateQueries({ queryKey: ["guest-orders"] }),
    );
    socket.on("connected", () =>
      qc.invalidateQueries({ queryKey: ["guest-orders"] }),
    );
    return () => {
      socket.close();
    };
  }, [qc]);
  const submit = useMutation({
    mutationFn: () =>
      api.post(
        "/guest/orders",
        {
          guestId: guestId(),
          items: lines.map((l) => ({
            menuItemId: l.item._id,
            quantity: l.quantity,
            variantId: l.variant?._id,
            extraIds: l.extras.map((e) => e._id),
            notes: l.notes,
          })),
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      clear();
      qc.invalidateQueries({ queryKey: ["guest-orders"] });
      toast.success("Order sent to the kitchen");
    },
    onError: (e) => toast.error(e.message),
  });
  const call = useMutation({
    mutationFn: (type: string) => api.post("/guest/waiter-calls", { type }),
    onSuccess: () => toast.success("The team has been notified"),
    onError: (e) => toast.error(e.message),
  });
  const subtotal = total();
  const estimatedTax = Math.round(
    (subtotal * (settings.data?.taxRateBps || 0)) / 10000,
  );
  const estimatedService = Math.round(
    (subtotal * (settings.data?.serviceRateBps || 0)) / 10000,
  );
  const estimatedTotal = subtotal + estimatedTax + estimatedService;
  const activeOrders = (orders.data || []).filter(
    (order) => !["rejected", "cancelled"].includes(order.status),
  );
  const orderedSubtotal = activeOrders.reduce(
    (sum, order) => sum + (order.subtotal || 0),
    0,
  );
  const orderedTax = activeOrders.reduce(
    (sum, order) => sum + (order.tax || 0),
    0,
  );
  const orderedService = activeOrders.reduce(
    (sum, order) => sum + (order.serviceCharge || 0),
    0,
  );
  const orderedTotal = activeOrders.reduce(
    (sum, order) => sum + order.total,
    0,
  );
  const sessionItemCount = activeOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((count, item) => count + item.quantity, 0),
    0,
  );
  if (session.isLoading || menu.isLoading) return <Loading />;
  if (session.error)
    return (
      <div className="grid min-h-screen place-items-center p-5">
        <Empty
          title="Session unavailable"
          body="Scan the table QR code again or ask a team member for help."
        />
      </div>
    );
  return (
    <main className="min-h-screen bg-cream pb-28">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-paper/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs text-ink/50">Ordering for</p>
            <h1 className="font-serif text-xl">
              {session.data?.table.displayName ||
                `Table ${session.data?.table.number}`}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              aria-label="Call waiter"
              onClick={() => call.mutate("waiter")}
              className="rounded-full bg-black/5 p-3"
            >
              <Bell size={19} />
            </button>
            <button
              aria-label="Request bill"
              onClick={() => call.mutate("bill")}
              className="rounded-full bg-black/5 p-3"
            >
              <ReceiptText size={19} />
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <section className="py-8">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-clay">
              Today’s menu
            </p>
            <h2 className="mt-2 font-serif text-4xl">
              What are you in the mood for?
            </h2>
          </section>
          <div className="grid gap-4">
            {menu.data?.items.map((item) => (
              <Card
                key={item._id}
                className="flex overflow-hidden"
                onClick={() => {
                  if (!item.soldOut) {
                    setSelected(item);
                    setQuantity(1);
                    setVariant(undefined);
                    setExtras([]);
                  }
                }}
              >
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl">{item.name}</h3>
                    <span className="font-semibold">
                      {formatMoney(item.basePrice)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-ink/60">
                    {item.description}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {item.dietaryLabels.slice(0, 2).map((x) => (
                      <Badge key={x}>{x}</Badge>
                    ))}
                    {item.soldOut && <Badge tone="bad">Sold out</Badge>}
                  </div>
                </div>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    className="w-28 object-cover"
                    alt=""
                  />
                )}
              </Card>
            ))}
          </div>
          {orders.data && orders.data.length > 0 && (
            <section className="mt-10">
              <h2 className="font-serif text-3xl">Your orders</h2>
              <div className="mt-4 grid gap-3">
                {orders.data.map((o) => (
                  <Card key={o._id} className="p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold">{o.orderNumber}</p>
                        <p className="mt-1 text-xs text-ink/50">
                          {o.items
                            .map((i) => `${i.quantity}× ${i.name}`)
                            .join(", ")}
                        </p>
                      </div>
                      <Badge
                        tone={
                          ["rejected", "cancelled"].includes(o.status)
                            ? "bad"
                            : ["ready", "served", "completed"].includes(
                                  o.status,
                                )
                              ? "good"
                              : "warn"
                        }
                      >
                        {o.status}
                      </Badge>
                    </div>
                    <StatusTimeline status={o.status} />
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="hidden lg:block">
          <Card className="sticky top-24 overflow-hidden p-0">
            <div className="border-b border-black/[.07] p-5">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-clay">
                Live bill preview
              </p>
              <div className="mt-2 flex items-end justify-between">
                <h2 className="font-serif text-3xl">Your table bill</h2>
                <span className="text-sm text-ink/45">
                  {sessionItemCount +
                    lines.reduce((sum, line) => sum + line.quantity, 0)}{" "}
                  items
                </span>
              </div>
            </div>
            {lines.length === 0 && activeOrders.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingBag className="mx-auto text-ink/20" size={36} />
                <p className="mt-4 font-semibold">Your bill is empty</p>
                <p className="mt-1 text-sm text-ink/45">
                  Select a dish to start your order.
                </p>
              </div>
            ) : (
              <>
                <div className="max-h-[42vh] divide-y overflow-auto px-5">
                  {activeOrders.map((order) => (
                    <div className="py-4" key={order._id}>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-clay">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-ink/40">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge
                          tone={
                            ["ready", "served", "completed"].includes(
                              order.status,
                            )
                              ? "good"
                              : "warn"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <div className="grid gap-2">
                        {order.items.map((item, index) => (
                          <div
                            className="flex justify-between gap-3 text-sm"
                            key={`${order._id}-${index}`}
                          >
                            <div>
                              <span className="font-semibold">
                                {item.quantity}×
                              </span>{" "}
                              {item.name}
                              {item.variant && (
                                <span className="text-ink/45">
                                  {" "}
                                  · {item.variant.name}
                                </span>
                              )}
                              {item.extras?.length > 0 && (
                                <p className="pl-5 text-xs text-ink/40">
                                  +{" "}
                                  {item.extras
                                    .map((extra) => extra.name)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                            <span className="whitespace-nowrap">
                              {formatMoney(
                                item.lineTotal,
                                settings.data?.currency,
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {lines.length > 0 && (
                    <div className="py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                        Not ordered yet
                      </p>
                    </div>
                  )}
                  {lines.map((line) => {
                    const unitPrice =
                      Math.round(
                        (line.item.basePrice *
                          (10000 - line.item.discountBps)) /
                          10000,
                      ) +
                      (line.variant?.priceDelta || 0) +
                      line.extras.reduce(
                        (sum, extra) => sum + extra.priceDelta,
                        0,
                      );
                    return (
                      <div className="py-4" key={line.key}>
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {line.item.name}
                            </p>
                            {line.variant && (
                              <p className="text-xs text-ink/45">
                                {line.variant.name}
                              </p>
                            )}
                            {line.extras.length > 0 && (
                              <p className="text-xs text-ink/45">
                                +{" "}
                                {line.extras
                                  .map((extra) => extra.name)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                          <p className="whitespace-nowrap text-sm font-semibold">
                            {formatMoney(
                              unitPrice * line.quantity,
                              settings.data?.currency,
                            )}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 rounded-full bg-black/5 px-2 py-1">
                            <button
                              aria-label="Decrease quantity"
                              onClick={() =>
                                setLineQuantity(line.key, line.quantity - 1)
                              }
                            >
                              <Minus size={15} />
                            </button>
                            <span className="min-w-4 text-center text-sm font-semibold">
                              {line.quantity}
                            </span>
                            <button
                              aria-label="Increase quantity"
                              onClick={() =>
                                setLineQuantity(line.key, line.quantity + 1)
                              }
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                          <button
                            aria-label={`Remove ${line.item.name}`}
                            className="text-ink/35 hover:text-red-700"
                            onClick={() => remove(line.key)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t bg-black/[.025] p-5">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink/55">Session subtotal</span>
                      <span>
                        {formatMoney(
                          orderedSubtotal + subtotal,
                          settings.data?.currency,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink/55">Tax</span>
                      <span>
                        {formatMoney(
                          orderedTax + estimatedTax,
                          settings.data?.currency,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink/55">Service charge</span>
                      <span>
                        {formatMoney(
                          orderedService + estimatedService,
                          settings.data?.currency,
                        )}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between border-t pt-3 text-lg font-bold">
                      <span>Running total</span>
                      <span>
                        {formatMoney(
                          orderedTotal + estimatedTotal,
                          settings.data?.currency,
                        )}
                      </span>
                    </div>
                  </div>
                  {lines.length > 0 && (
                    <Button
                      className="mt-5 w-full"
                      disabled={submit.isPending}
                      onClick={() => submit.mutate()}
                    >
                      <ShoppingBag className="mr-2 inline" size={18} />
                      {submit.isPending
                        ? "Sending…"
                        : activeOrders.length
                          ? "Place additional order"
                          : "Place order"}
                    </Button>
                  )}
                  {lines.length === 0 && activeOrders.length > 0 && (
                    <Button
                      className="mt-5 w-full !bg-ink"
                      disabled={call.isPending}
                      onClick={() => call.mutate("bill")}
                    >
                      <ReceiptText className="mr-2 inline" size={18} />
                      Request final bill
                    </Button>
                  )}
                  <p className="mt-3 text-center text-xs text-ink/40">
                    This running bill remains until staff closes your table
                    session.
                  </p>
                </div>
              </>
            )}
          </Card>
        </aside>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45">
          <div className="max-h-[88vh] w-full overflow-auto rounded-t-[2rem] bg-paper p-5">
            <div className="mx-auto max-w-xl">
              <button
                onClick={() => setSelected(undefined)}
                className="mb-4 rounded-full bg-black/5 p-2"
              >
                <ChevronLeft />
              </button>
              <h2 className="font-serif text-3xl">{selected.name}</h2>
              <p className="mt-3 text-ink/60">{selected.description}</p>
              {selected.allergens.length > 0 && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  Allergens: {selected.allergens.join(", ")}
                </p>
              )}
              {selected.variants.length > 0 && (
                <OptionGroup
                  title="Choose one"
                  options={selected.variants}
                  selected={variant ? [variant] : []}
                  toggle={(o) => setVariant(o)}
                />
              )}{" "}
              {selected.extras.length > 0 && (
                <OptionGroup
                  title="Add something extra"
                  options={selected.extras}
                  selected={extras}
                  toggle={(o) =>
                    setExtras((x) =>
                      x.some((e) => e._id === o._id)
                        ? x.filter((e) => e._id !== o._id)
                        : [...x, o],
                    )
                  }
                />
              )}
              <div className="mt-7 flex items-center justify-between">
                <div className="flex items-center gap-4 rounded-full bg-black/5 p-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus />
                  </button>
                  <b>{quantity}</b>
                  <button onClick={() => setQuantity(quantity + 1)}>
                    <Plus />
                  </button>
                </div>
                <Button
                  onClick={() => {
                    const line: CartLine = {
                      key: crypto.randomUUID(),
                      item: selected,
                      quantity,
                      variant,
                      extras,
                    };
                    add(line);
                    setSelected(undefined);
                  }}
                >
                  Add ·{" "}
                  {formatMoney(
                    (selected.basePrice +
                      (variant?.priceDelta || 0) +
                      extras.reduce((a, e) => a + e.priceDelta, 0)) *
                      quantity,
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}{" "}
      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-paper p-4 lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold">
                {lines.reduce((a, l) => a + l.quantity, 0)} items
              </p>
              <p className="text-sm text-ink/50">
                {formatMoney(total())} before tax & service
              </p>
            </div>
            <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
              <ShoppingBag className="mr-2 inline" size={18} />
              {submit.isPending ? "Sending…" : "Place order"}
            </Button>
          </div>
        </div>
      )}
      {lines.length === 0 && activeOrders.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-paper p-4 lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold">Running table bill</p>
              <p className="text-sm text-ink/50">
                {formatMoney(orderedTotal, settings.data?.currency)} ·{" "}
                {sessionItemCount} items
              </p>
            </div>
            <Button
              className="!bg-ink"
              disabled={call.isPending}
              onClick={() => call.mutate("bill")}
            >
              <ReceiptText className="mr-2 inline" size={18} />
              Request bill
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
function OptionGroup({
  title,
  options,
  selected,
  toggle,
}: {
  title: string;
  options: Option[];
  selected: Option[];
  toggle: (o: Option) => void;
}) {
  return (
    <div className="mt-6">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-2 grid gap-2">
        {options
          .filter((o) => o.available)
          .map((o) => (
            <button
              key={o._id}
              onClick={() => toggle(o)}
              className={`flex justify-between rounded-xl border p-3 text-left ${selected.some((x) => x._id === o._id) ? "border-clay bg-clay/5" : "border-black/10"}`}
            >
              <span>{o.name}</span>
              <span>
                {o.priceDelta ? (
                  `+${formatMoney(o.priceDelta)}`
                ) : (
                  <Check size={18} />
                )}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
function StatusTimeline({ status }: { status: string }) {
  const steps = ["pending", "accepted", "preparing", "ready", "served"];
  const current = steps.indexOf(status);
  return (
    <div className="mt-4 flex items-center">
      {steps.map((s, i) => (
        <div className="flex flex-1 items-center last:flex-none" key={s}>
          <span
            title={s}
            className={`size-2.5 rounded-full ${i <= current ? "bg-clay" : "bg-black/10"}`}
          />
          {i < steps.length - 1 && (
            <span
              className={`h-px flex-1 ${i < current ? "bg-clay" : "bg-black/10"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
