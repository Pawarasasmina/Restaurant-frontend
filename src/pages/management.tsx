import { ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit3,
  Eye,
  ImagePlus,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatMoney } from "../services/api";
import { Badge, Button, Card, Empty, Input, Loading } from "../components/ui";
import type { Category, MenuItem } from "../types";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const value = (form: FormData, key: string) =>
  String(form.get(key) || "").trim();
const numeric = (form: FormData, key: string) => Number(form.get(key) || 0);

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-auto bg-black/55 p-4">
      <Card className="my-8 w-full max-w-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button className="rounded-full bg-black/5 p-2" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </Card>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Submit({
  busy,
  label = "Save changes",
}: {
  busy: boolean;
  label?: string;
}) {
  return (
    <div className="mt-6 flex justify-end">
      <Button disabled={busy}>{busy ? "Saving…" : label}</Button>
    </div>
  );
}
function Header({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-ink/50">{eyebrow}</p>
        <h2 className="font-serif text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function CategoriesManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const query = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories?limit=100"),
  });
  const save = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api.patch(`/categories/${editing._id}`, payload)
        : api.post("/categories", payload),
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category created");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) => toast.error(e.message),
  });
  if (query.isLoading) return <Loading />;
  return (
    <div>
      <Header
        eyebrow="Organize the menu"
        title="Categories"
        action={
          <Button onClick={() => setEditing({})}>
            <Plus className="mr-2 inline" size={17} />
            New category
          </Button>
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {query.data?.map((c) => (
          <Card className="p-5" key={c._id}>
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl">{c.name}</h3>
                <p className="mt-2 text-sm text-ink/55">
                  {c.description || "No description"}
                </p>
              </div>
              <Badge>
                {(c as any).visible === false ? "Hidden" : "Visible"}
              </Badge>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                className="rounded-lg bg-black/5 p-2"
                onClick={() => setEditing(c)}
              >
                <Edit3 size={17} />
              </button>
              <button
                className="rounded-lg bg-red-50 p-2 text-red-700"
                onClick={() =>
                  confirm(`Delete ${c.name}?`) && remove.mutate(c._id)
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      {!query.data?.length && (
        <div className="mt-6">
          <Empty
            title="No categories"
            body="Create a category before adding dishes."
          />
        </div>
      )}
      {editing && (
        <Modal
          title={editing._id ? "Edit category" : "New category"}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const name = value(f, "name");
              save.mutate({
                name,
                slug: value(f, "slug") || slugify(name),
                description: value(f, "description"),
                visible: f.get("visible") === "on",
                order: numeric(f, "order"),
              });
            }}
            className="grid gap-4"
          >
            <Field label="Name">
              <Input name="name" defaultValue={editing.name} required />
            </Field>
            <Field label="Slug">
              <Input
                name="slug"
                defaultValue={editing.slug}
                placeholder="generated-from-name"
              />
            </Field>
            <Field label="Description">
              <Input name="description" defaultValue={editing.description} />
            </Field>
            <Field label="Display order">
              <Input
                name="order"
                type="number"
                defaultValue={(editing as any).order || 0}
              />
            </Field>
            <label className="flex gap-2 text-sm">
              <input
                name="visible"
                type="checkbox"
                defaultChecked={(editing as any).visible !== false}
              />{" "}
              Visible on public menu
            </label>
            <Submit busy={save.isPending} />
          </form>
        </Modal>
      )}
    </div>
  );
}

export function MenuManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);
  const menu = useQuery<MenuItem[]>({
    queryKey: ["menu-items"],
    queryFn: () => api.get("/menu-items?limit=100"),
  });
  const categories = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories?limit=100"),
  });
  const save = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api.patch(`/menu-items/${editing._id}`, payload)
        : api.post("/menu-items", payload),
    onSuccess: () => {
      toast.success(editing ? "Dish updated" : "Dish created");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/menu-items/${id}`),
    onSuccess: () => {
      toast.success("Dish deleted");
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (e) => toast.error(e.message),
  });
  if (menu.isLoading || categories.isLoading) return <Loading />;
  return (
    <div>
      <Header
        eyebrow="Dishes, prices and availability"
        title="Menu management"
        action={
          <div className="flex gap-2">
            <a
              href="/admin/categories"
              className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold"
            >
              Categories
            </a>
            <Button onClick={() => setEditing({})}>
              <Plus className="mr-2 inline" size={17} />
              Add dish
            </Button>
          </div>
        }
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {menu.data?.map((item) => (
          <Card className="flex overflow-hidden" key={item._id}>
            {item.imageUrl ? (
              <img className="w-32 object-cover" src={item.imageUrl} alt="" />
            ) : (
              <div className="grid w-32 place-items-center bg-black/5 text-xs text-ink/40">
                No image
              </div>
            )}
            <div className="min-w-0 flex-1 p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="truncate font-serif text-xl">{item.name}</h3>
                  <p className="text-xs text-ink/45">{item.category?.name}</p>
                </div>
                <b>{formatMoney(item.basePrice)}</b>
              </div>
              <div className="mt-3 flex gap-2">
                <Badge tone={item.available && !item.soldOut ? "good" : "bad"}>
                  {item.soldOut
                    ? "Sold out"
                    : item.available
                      ? "Available"
                      : "Unavailable"}
                </Badge>
                {item.featured && <Badge>Featured</Badge>}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="rounded-lg bg-black/5 p-2"
                  onClick={() => setEditing(item)}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  className="rounded-lg bg-red-50 p-2 text-red-700"
                  onClick={() =>
                    confirm(`Delete ${item.name}?`) && remove.mutate(item._id)
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {!menu.data?.length && (
        <div className="mt-6">
          <Empty title="No dishes" body="Add your first menu item." />
        </div>
      )}
      {editing && (
        <Modal
          title={editing._id ? "Edit dish" : "Add dish"}
          onClose={() => setEditing(null)}
        >
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const name = value(f, "name");
              save.mutate({
                name,
                slug: value(f, "slug") || slugify(name),
                category: value(f, "category"),
                description: value(f, "description"),
                imageUrl: value(f, "imageUrl"),
                basePrice: Math.round(numeric(f, "price") * 100),
                discountBps: Math.round(numeric(f, "discount") * 100),
                prepMinutes: numeric(f, "prepMinutes"),
                ingredients: value(f, "ingredients")
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
                allergens: value(f, "allergens")
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
                dietaryLabels: value(f, "dietaryLabels")
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
                visible: f.get("visible") === "on",
                available: f.get("available") === "on",
                featured: f.get("featured") === "on",
                soldOut: f.get("soldOut") === "on",
                variants: editing.variants || [],
                extras: editing.extras || [],
              });
            }}
          >
            <Field label="Dish name">
              <Input name="name" defaultValue={editing.name} required />
            </Field>
            <Field label="Category">
              <select
                name="category"
                defaultValue={
                  typeof editing.category === "object"
                    ? editing.category?._id
                    : String(editing.category || "")
                }
                required
                className="rounded-xl border border-black/10 bg-paper px-4 py-3"
              >
                {categories.data?.map((c) => (
                  <option value={c._id} key={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Slug">
              <Input name="slug" defaultValue={editing.slug} />
            </Field>
            <Field label="Price (LKR)">
              <Input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  editing.basePrice != null ? editing.basePrice / 100 : ""
                }
                required
              />
            </Field>
            <Field label="Description">
              <Input name="description" defaultValue={editing.description} />
            </Field>
            <Field label="Image URL">
              <Input
                name="imageUrl"
                type="url"
                defaultValue={editing.imageUrl}
              />
            </Field>
            <Field label="Ingredients (comma separated)">
              <Input
                name="ingredients"
                defaultValue={editing.ingredients?.join(", ")}
              />
            </Field>
            <Field label="Allergens (comma separated)">
              <Input
                name="allergens"
                defaultValue={editing.allergens?.join(", ")}
              />
            </Field>
            <Field label="Dietary labels">
              <Input
                name="dietaryLabels"
                defaultValue={editing.dietaryLabels?.join(", ")}
              />
            </Field>
            <Field label="Preparation minutes">
              <Input
                name="prepMinutes"
                type="number"
                min="0"
                defaultValue={editing.prepMinutes || 15}
              />
            </Field>
            <Field label="Discount percent">
              <Input
                name="discount"
                type="number"
                min="0"
                max="100"
                defaultValue={(editing.discountBps || 0) / 100}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2 text-sm md:col-span-2">
              {[
                ["visible", "Visible", editing.visible !== false],
                ["available", "Available", editing.available !== false],
                ["featured", "Featured", editing.featured],
                ["soldOut", "Sold out", editing.soldOut],
              ].map(([n, l, c]) => (
                <label className="flex gap-2" key={String(n)}>
                  <input
                    name={String(n)}
                    type="checkbox"
                    defaultChecked={Boolean(c)}
                  />
                  {String(l)}
                </label>
              ))}
            </div>
            <div className="md:col-span-2">
              <Submit busy={save.isPending} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function TablesManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [qr, setQr] = useState<{
    url: string;
    token: string;
    table: string;
  } | null>(null);
  const query = useQuery<any[]>({
    queryKey: ["tables"],
    queryFn: () => api.get("/tables"),
  });
  const save = useMutation({
    mutationFn: (p: any) =>
      editing ? api.patch(`/tables/${editing._id}`, p) : api.post("/tables", p),
    onSuccess: (d: any) => {
      toast.success(editing ? "Table updated" : "Table created");
      if (d?.qrUrl)
        setQr({ url: d.qrUrl, token: d.qrToken, table: d.table.number });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`),
    onSuccess: () => {
      toast.success("Table deleted");
      qc.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const regenerate = useMutation({
    mutationFn: (t: any) => api.post(`/tables/${t._id}/qr/regenerate`),
    onSuccess: (d: any, table: any) => {
      setQr({ url: d.qrUrl, token: d.qrToken, table: table.number });
      toast.success("Old QR revoked; new QR created");
    },
    onError: (e) => toast.error(e.message),
  });
  if (query.isLoading) return <Loading />;
  return (
    <div>
      <Header
        eyebrow="Floor, capacity and QR access"
        title="Table management"
        action={
          <Button onClick={() => setEditing({})}>
            <Plus className="mr-2 inline" size={17} />
            Add table
          </Button>
        }
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {query.data?.map((t) => (
          <Card className="p-5" key={t._id}>
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-ink/45">{t.zone}</p>
                <h3 className="font-serif text-3xl">
                  {t.displayName || `Table ${t.number}`}
                </h3>
              </div>
              <Badge
                tone={
                  t.state === "available"
                    ? "good"
                    : t.state === "disabled"
                      ? "bad"
                      : "warn"
                }
              >
                {t.state}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-ink/55">
              Seats {t.capacity} · QR …{t.qrTokenHint}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                title="Edit"
                className="rounded-lg bg-black/5 p-2"
                onClick={() => setEditing(t)}
              >
                <Edit3 size={16} />
              </button>
              <button
                title="Regenerate QR"
                className="rounded-lg bg-black/5 p-2"
                onClick={() =>
                  confirm("Revoke the old QR and create a new one?") &&
                  regenerate.mutate(t)
                }
              >
                <RefreshCw size={16} />
              </button>
              <button
                title="Delete"
                className="rounded-lg bg-red-50 p-2 text-red-700"
                onClick={() =>
                  confirm(`Delete table ${t.number}?`) && remove.mutate(t._id)
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      {editing && (
        <Modal
          title={editing._id ? "Edit table" : "Add table"}
          onClose={() => setEditing(null)}
        >
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save.mutate({
                number: value(f, "number"),
                displayName: value(f, "displayName"),
                capacity: numeric(f, "capacity"),
                zone: value(f, "zone"),
                active: f.get("active") === "on",
                state: value(f, "state"),
              });
            }}
          >
            <Field label="Table number">
              <Input name="number" defaultValue={editing.number} required />
            </Field>
            <Field label="Display name">
              <Input name="displayName" defaultValue={editing.displayName} />
            </Field>
            <Field label="Capacity">
              <Input
                name="capacity"
                type="number"
                min="1"
                defaultValue={editing.capacity || 4}
                required
              />
            </Field>
            <Field label="Zone">
              <Input
                name="zone"
                defaultValue={editing.zone || "Dining Room"}
                required
              />
            </Field>
            <Field label="State">
              <select
                name="state"
                defaultValue={editing.state || "available"}
                className="rounded-xl border border-black/10 bg-paper px-4 py-3"
              >
                {[
                  "available",
                  "occupied",
                  "reserved",
                  "cleaning",
                  "disabled",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-end gap-2 pb-3 text-sm">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing.active !== false}
              />{" "}
              Active table
            </label>
            <div className="md:col-span-2">
              <Submit busy={save.isPending} />
            </div>
          </form>
        </Modal>
      )}
      {qr && (
        <Modal
          title={`QR created for table ${qr.table}`}
          onClose={() => setQr(null)}
        >
          <div className="text-center">
            <QrCode className="mx-auto text-clay" size={80} />
            <p className="mt-4 text-sm text-ink/55">
              Save this link now. For security, the raw token is not stored
              visibly later.
            </p>
            <a
              href={qr.url}
              target="_blank"
              className="mt-4 block break-all rounded-xl bg-black/5 p-4 text-sm text-clay"
            >
              {qr.url}
            </a>
            <Button
              className="mt-5"
              onClick={() =>
                navigator.clipboard
                  .writeText(qr.url)
                  .then(() => toast.success("QR link copied"))
              }
            >
              Copy ordering link
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function StaffManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const query = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: () => api.get("/staff"),
  });
  const save = useMutation({
    mutationFn: (p: any) =>
      editing ? api.patch(`/staff/${editing._id}`, p) : api.post("/staff", p),
    onSuccess: (d: any) => {
      toast.success(
        editing
          ? "Staff account updated"
          : d.temporaryPassword
            ? `Staff created. Temporary password: ${d.temporaryPassword}`
            : "Staff account created",
        { duration: 10000 },
      );
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e) => toast.error(e.message),
  });
  if (query.isLoading) return <Loading />;
  return (
    <div>
      <Header
        eyebrow="Accounts, roles and access"
        title="Staff management"
        action={
          <Button onClick={() => setEditing({})}>
            <Plus className="mr-2 inline" size={17} />
            Add staff member
          </Button>
        }
      />
      <Card className="mt-6 overflow-hidden">
        <div className="divide-y">
          {query.data?.map((s) => (
            <div
              key={s._id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-sm text-ink/50">{s.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={s.active ? "good" : "bad"}>
                  {s.role} · {s.active ? "active" : "inactive"}
                </Badge>
                <button
                  className="rounded-lg bg-black/5 p-2"
                  onClick={() => setEditing(s)}
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {editing && (
        <Modal
          title={editing._id ? "Edit staff member" : "Create staff account"}
          onClose={() => setEditing(null)}
        >
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const payload: any = {
                name: value(f, "name"),
                role: value(f, "role"),
                active: f.get("active") === "on",
              };
              if (!editing._id) payload.email = value(f, "email");
              if (value(f, "password")) payload.password = value(f, "password");
              save.mutate(payload);
            }}
          >
            <Field label="Full name">
              <Input name="name" defaultValue={editing.name} required />
            </Field>
            <Field label="Email">
              <Input
                name="email"
                type="email"
                defaultValue={editing.email}
                disabled={Boolean(editing._id)}
                required
              />
            </Field>
            <Field label="Role">
              <select
                name="role"
                defaultValue={editing.role || "waiter"}
                className="rounded-xl border border-black/10 bg-paper px-4 py-3"
              >
                {["owner", "manager", "cashier", "waiter", "chef"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field
              label={
                editing._id
                  ? "New password (optional)"
                  : "Password (leave blank to generate)"
              }
            >
              <Input name="password" type="password" minLength={8} />
            </Field>
            <label className="flex gap-2 text-sm md:col-span-2">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing.active !== false}
              />{" "}
              Account active
            </label>
            <div className="md:col-span-2">
              <Submit busy={save.isPending} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function ReservationsManager() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const query = useQuery<any[]>({
    queryKey: ["reservations"],
    queryFn: () => api.get("/reservations"),
  });
  const create = useMutation({
    mutationFn: (p: any) => api.post("/reservations", p),
    onSuccess: () => {
      toast.success("Reservation created");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/reservations/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
    onError: (e) => toast.error(e.message),
  });
  if (query.isLoading) return <Loading />;
  return (
    <div>
      <Header
        eyebrow="Bookings and table allocation"
        title="Reservations"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 inline" size={17} />
            Manual booking
          </Button>
        }
      />
      <div className="mt-6 grid gap-4">
        {query.data?.map((r) => (
          <Card
            key={r._id}
            className="flex flex-wrap items-center justify-between gap-4 p-5"
          >
            <div>
              <h3 className="font-semibold">
                {r.name} · {r.partySize} guests
              </h3>
              <p className="mt-1 text-sm text-ink/50">
                {new Date(r.date).toLocaleString()} · {r.phone} ·{" "}
                {r.table?.displayName || "Allocating table"}
              </p>
              {r.notes && <p className="mt-2 text-sm">{r.notes}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  r.status === "confirmed"
                    ? "good"
                    : r.status === "cancelled"
                      ? "bad"
                      : "warn"
                }
              >
                {r.status}
              </Badge>
              <select
                aria-label="Update reservation status"
                value={r.status}
                onChange={(e) =>
                  update.mutate({ id: r._id, status: e.target.value })
                }
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
              >
                {[
                  "pending",
                  "confirmed",
                  "seated",
                  "completed",
                  "cancelled",
                  "no-show",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
          </Card>
        ))}
      </div>
      {!query.data?.length && (
        <div className="mt-6">
          <Empty
            title="No reservations"
            body="Public and manually created bookings appear here."
          />
        </div>
      )}
      {creating && (
        <Modal title="Create reservation" onClose={() => setCreating(false)}>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              create.mutate({
                name: value(f, "name"),
                phone: value(f, "phone"),
                email: value(f, "email"),
                partySize: numeric(f, "partySize"),
                date: new Date(value(f, "date")).toISOString(),
                notes: value(f, "notes"),
              });
            }}
          >
            <Field label="Guest name">
              <Input name="name" required />
            </Field>
            <Field label="Phone">
              <Input name="phone" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" />
            </Field>
            <Field label="Party size">
              <Input
                name="partySize"
                type="number"
                min="1"
                defaultValue="2"
                required
              />
            </Field>
            <Field label="Date and time">
              <Input name="date" type="datetime-local" required />
            </Field>
            <Field label="Notes">
              <Input name="notes" />
            </Field>
            <div className="md:col-span-2">
              <Submit busy={create.isPending} label="Create booking" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function SettingsManager() {
  const qc = useQueryClient();
  const query = useQuery<any>({
    queryKey: ["settings-admin"],
    queryFn: () => api.get("/settings"),
  });
  const save = useMutation({
    mutationFn: (p: any) => api.put("/settings", p),
    onSuccess: () => {
      toast.success("Restaurant settings saved");
      qc.invalidateQueries({ queryKey: ["settings-admin"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(e.message),
  });
  if (query.isLoading) return <Loading />;
  const s = query.data || {};
  return (
    <div>
      <Header
        eyebrow="Brand, contact and charges"
        title="Restaurant settings"
      />
      <div className="mt-6 grid overflow-hidden rounded-3xl border border-black/[.08] bg-ink text-white lg:grid-cols-[1.25fr_.75fr]">
        <div className="relative min-h-64 overflow-hidden p-7">
          {s.heroImageUrl && (
            <img
              src={s.heroImageUrl}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-45"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/10" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <Badge>Current website</Badge>
              <h3 className="mt-4 max-w-lg font-serif text-4xl">
                {s.websiteTheme?.heroTitle || s.name || "Your restaurant"}
              </h3>
              <p className="mt-2 max-w-md text-sm text-white/65">
                {s.description ||
                  "Your public website preview will appear here."}
              </p>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              <Eye size={16} /> Open live website
            </a>
          </div>
        </div>
        <nav
          className="grid content-center gap-2 bg-white/[.06] p-6"
          aria-label="Settings sections"
        >
          {[
            [
              "branding",
              "Brand & contact",
              "Logo, identity and contact details",
            ],
            ["design", "Website design", "Images, layouts and visual style"],
            ["seasonal", "Seasonal experience", "Animations and announcements"],
            [
              "operations",
              "Ordering settings",
              "Currency, charges and sessions",
            ],
          ].map(([id, title, body], index) => (
            <a
              key={id}
              href={`#settings-${id}`}
              className="flex items-center gap-4 rounded-2xl border border-white/10 p-4 transition hover:bg-white/10"
            >
              <span className="grid size-8 place-items-center rounded-full bg-white/10 text-sm">
                {index + 1}
              </span>
              <span>
                <b className="block text-sm">{title}</b>
                <span className="text-xs text-white/50">{body}</span>
              </span>
            </a>
          ))}
        </nav>
      </div>
      <Card className="mt-6 p-5 md:p-7">
        <form
          className="grid gap-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save.mutate({
              name: value(f, "name"),
              description: value(f, "description"),
              phone: value(f, "phone"),
              email: value(f, "email"),
              address: value(f, "address"),
              mapUrl: value(f, "mapUrl"),
              logoUrl: value(f, "logoUrl"),
              heroImageUrl: value(f, "heroImageUrl"),
              brandColor: value(f, "brandColor"),
              timezone: value(f, "timezone"),
              currency: value(f, "currency"),
              taxRateBps: Math.round(numeric(f, "taxRate") * 100),
              serviceRateBps: Math.round(numeric(f, "serviceRate") * 100),
              tableSessionMinutes: numeric(f, "tableSessionMinutes"),
              websiteTheme: {
                heroEyebrow: value(f, "heroEyebrow"),
                heroTitle: value(f, "heroTitle"),
                heroOverlay: numeric(f, "heroOverlay"),
                storyEyebrow: value(f, "storyEyebrow"),
                storyTitle: value(f, "storyTitle"),
                storyText: value(f, "storyText"),
                storyImageUrl: value(f, "storyImageUrl"),
                seasonalEnabled: f.get("seasonalEnabled") === "on",
                seasonalEffect: value(f, "seasonalEffect"),
                stylePreset: value(f, "stylePreset"),
                cardStyle: value(f, "cardStyle"),
                buttonStyle: value(f, "buttonStyle"),
                heroAlignment: value(f, "heroAlignment"),
                contentWidth: value(f, "contentWidth"),
                announcement: value(f, "announcement"),
                announcementEnabled: f.get("announcementEnabled") === "on",
              },
            });
          }}
        >
          <div id="settings-branding" className="scroll-mt-28 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-clay">
              Section 1
            </p>
            <h3 className="font-serif text-3xl">Brand and contact</h3>
          </div>
          <Field label="Restaurant name">
            <Input name="name" defaultValue={s.name} required />
          </Field>
          <Field label="Contact email">
            <Input name="email" type="email" defaultValue={s.email} />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={s.phone} />
          </Field>
          <Field label="Address">
            <Input name="address" defaultValue={s.address} />
          </Field>
          <Field label="Map URL">
            <Input name="mapUrl" type="url" defaultValue={s.mapUrl} />
          </Field>
          <Field label="Brand color">
            <Input
              name="brandColor"
              type="color"
              defaultValue={s.brandColor || "#8c3b2a"}
            />
          </Field>
          <ImageUploadField
            name="logoUrl"
            label="Restaurant logo"
            initialUrl={s.logoUrl}
            compact
          />
          <ImageUploadField
            name="heroImageUrl"
            label="Homepage cover image"
            initialUrl={s.heroImageUrl}
          />
          <div
            id="settings-operations"
            className="scroll-mt-28 border-t pt-6 md:col-span-2"
          >
            <p className="text-xs font-bold uppercase tracking-[.18em] text-clay">
              Section 4
            </p>
            <h3 className="font-serif text-3xl">Ordering settings</h3>
          </div>
          <Field label="Timezone">
            <Input
              name="timezone"
              defaultValue={s.timezone || "Asia/Colombo"}
            />
          </Field>
          <Field label="Currency">
            <Input name="currency" defaultValue={s.currency || "LKR"} />
          </Field>
          <Field label="Tax percent">
            <Input
              name="taxRate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={(s.taxRateBps || 0) / 100}
            />
          </Field>
          <Field label="Service charge percent">
            <Input
              name="serviceRate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={(s.serviceRateBps || 0) / 100}
            />
          </Field>
          <Field label="Table session minutes">
            <Input
              name="tableSessionMinutes"
              type="number"
              min="5"
              defaultValue={s.tableSessionMinutes || 240}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Restaurant description">
              <textarea
                name="description"
                rows={4}
                defaultValue={s.description}
                className="rounded-xl border border-black/10 bg-paper px-4 py-3 outline-none"
              />
            </Field>
          </div>
          <div
            id="settings-design"
            className="md:col-span-2 mt-3 scroll-mt-28 border-t pt-6"
          >
            <h3 className="font-serif text-3xl">Website design</h3>
            <p className="mt-1 text-sm text-ink/50">
              Control the public homepage content, cover images, announcement,
              and seasonal atmosphere.
            </p>
          </div>
          <StyleVisualControls theme={s.websiteTheme} />
          <Field label="Hero eyebrow">
            <Input
              name="heroEyebrow"
              defaultValue={
                s.websiteTheme?.heroEyebrow || "Modern Sri Lankan dining"
              }
            />
          </Field>
          <Field label="Hero title">
            <Input
              name="heroTitle"
              defaultValue={
                s.websiteTheme?.heroTitle || "Fire, spice, island soul."
              }
            />
          </Field>
          <Field label="Hero image darkness (%)">
            <Input
              name="heroOverlay"
              type="number"
              min="0"
              max="90"
              defaultValue={s.websiteTheme?.heroOverlay ?? 55}
            />
          </Field>
          <ImageUploadField
            name="storyImageUrl"
            label="Story section image"
            initialUrl={s.websiteTheme?.storyImageUrl}
          />
          <Field label="Story eyebrow">
            <Input
              name="storyEyebrow"
              defaultValue={s.websiteTheme?.storyEyebrow || "Our story"}
            />
          </Field>
          <Field label="Story title">
            <Input
              name="storyTitle"
              defaultValue={
                s.websiteTheme?.storyTitle || "Rooted here. Looking forward."
              }
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Story text">
              <textarea
                name="storyText"
                rows={4}
                defaultValue={s.websiteTheme?.storyText}
                className="rounded-xl border border-black/10 bg-paper px-4 py-3 outline-none"
              />
            </Field>
          </div>
          <div
            id="settings-seasonal"
            className="md:col-span-2 mt-3 scroll-mt-28 border-t pt-6"
          >
            <h3 className="font-serif text-3xl">Seasonal experience</h3>
            <p className="mt-1 text-sm text-ink/50">
              Choose one subtle full-screen animation. Visitors with
              reduced-motion enabled will see a static version.
            </p>
          </div>
          <SeasonVisualPicker
            defaultValue={s.websiteTheme?.seasonalEffect || "none"}
          />
          <label className="flex items-center gap-3 rounded-xl bg-black/[.03] p-4 text-sm">
            <input
              name="seasonalEnabled"
              type="checkbox"
              defaultChecked={s.websiteTheme?.seasonalEnabled}
            />{" "}
            Enable seasonal animation
          </label>
          <Field label="Announcement text">
            <Input
              name="announcement"
              maxLength={180}
              defaultValue={s.websiteTheme?.announcement}
              placeholder="Christmas dinner bookings are now open"
            />
          </Field>
          <label className="flex items-center gap-3 rounded-xl bg-black/[.03] p-4 text-sm">
            <input
              name="announcementEnabled"
              type="checkbox"
              defaultChecked={s.websiteTheme?.announcementEnabled}
            />{" "}
            Show announcement bar
          </label>
          <div className="md:col-span-2">
            <Submit busy={save.isPending} />
          </div>
        </form>
      </Card>
    </div>
  );
}

function ImageUploadField({
  name,
  label,
  initialUrl = "",
  compact = false,
}: {
  name: string;
  label: string;
  initialUrl?: string;
  compact?: boolean;
}) {
  const [url, setUrl] = useState(initialUrl);
  const upload = useMutation<{ url: string }, Error, File>({
    mutationFn: (file) => {
      const body = new FormData();
      body.append("image", file);
      return api.post("/uploads/images", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (result) => {
      const apiOrigin = new URL(
        import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1",
        window.location.origin,
      ).origin;
      setUrl(
        result.url.startsWith("/") ? `${apiOrigin}${result.url}` : result.url,
      );
      toast.success(`${label} uploaded`);
    },
    onError: (error) => toast.error(error.message),
  });
  const choose = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    upload.mutate(file);
  };
  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div
        className={`group relative overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-black/[.025] ${compact ? "h-48" : "h-56"}`}
      >
        {url ? (
          <img
            src={url}
            alt={`${label} preview`}
            className={`size-full ${compact ? "object-contain p-5" : "object-cover"}`}
          />
        ) : (
          <div className="grid size-full place-items-center text-center text-ink/40">
            <div>
              <ImagePlus className="mx-auto" size={34} />
              <p className="mt-2 text-sm">No image selected</p>
            </div>
          </div>
        )}
        {upload.isPending && (
          <div className="absolute inset-0 grid place-items-center bg-ink/70 text-sm font-semibold text-white">
            Uploading image…
          </div>
        )}
        <div className="absolute inset-x-3 bottom-3 flex justify-center gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-lg">
            <Upload size={15} /> {url ? "Replace" : "Upload image"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={upload.isPending}
              onChange={(event) => {
                choose(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {url && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg"
              onClick={() => setUrl("")}
            >
              <Trash2 size={15} /> Remove
            </button>
          )}
        </div>
      </div>
      <details className="text-xs text-ink/45">
        <summary className="cursor-pointer">Use an image URL instead</summary>
        <Input
          className="mt-2"
          type="url"
          value={url}
          placeholder="https://…"
          onChange={(event) => setUrl(event.target.value)}
        />
      </details>
      <p className="text-xs text-ink/40">
        JPG, PNG, WebP or GIF · maximum 5 MB
      </p>
    </div>
  );
}

type VisualOption = {
  value: string;
  label: string;
  description: string;
  preview: ReactNode;
};

function VisualChoiceGroup({
  name,
  title,
  defaultValue,
  options,
  compact = false,
}: {
  name: string;
  title: string;
  defaultValue: string;
  options: VisualOption[];
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(defaultValue);
  return (
    <fieldset className="md:col-span-2">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      <div
        className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-5"}`}
      >
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <label
              key={option.value}
              className={`group cursor-pointer overflow-hidden rounded-2xl border-2 transition ${active ? "border-clay bg-clay/[.04] shadow-md" : "border-black/[.07] bg-white hover:border-black/20"}`}
            >
              <input
                className="sr-only"
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => setSelected(option.value)}
              />
              <div className="relative h-24 overflow-hidden bg-black/[.03]">
                {option.preview}
                <span
                  className={`absolute right-2 top-2 grid size-5 place-items-center rounded-full border text-xs ${active ? "border-clay bg-clay text-white" : "border-white/80 bg-white/80 text-transparent"}`}
                >
                  ✓
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-xs leading-5 text-ink/50">
                  {option.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function MiniWebsite({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="absolute inset-0 p-3" style={{ background: colors[0] }}>
      <div
        className="h-2 w-16 rounded-full"
        style={{ background: colors[2] }}
      />
      <div
        className="mt-3 h-3 w-24 rounded"
        style={{ background: colors[1] }}
      />
      <div className="mt-2 h-1.5 w-16 rounded bg-white/60" />
      <div className="mt-3 flex gap-2">
        <span className="h-7 flex-1 rounded-lg bg-white/75 shadow-sm" />
        <span className="h-7 flex-1 rounded-lg bg-white/55" />
      </div>
    </div>
  );
}

function StyleVisualControls({
  theme = {},
}: {
  theme?: Record<string, string>;
}) {
  return (
    <>
      <VisualChoiceGroup
        name="stylePreset"
        title="Visual preset"
        defaultValue={theme.stylePreset || "signature"}
        options={[
          {
            value: "signature",
            label: "Signature warm",
            description: "Cream, clay and timeless hospitality.",
            preview: <MiniWebsite colors={["#f5ede1", "#2b2119", "#a44f36"]} />,
          },
          {
            value: "modern",
            label: "Modern editorial",
            description: "Crisp white space and bold typography.",
            preview: <MiniWebsite colors={["#eef2f0", "#15221e", "#4f7668"]} />,
          },
          {
            value: "minimal",
            label: "Clean minimal",
            description: "Quiet surfaces with almost no shadow.",
            preview: <MiniWebsite colors={["#fafafa", "#171717", "#b9b9b9"]} />,
          },
          {
            value: "tropical",
            label: "Tropical island",
            description: "Fresh greens and natural warmth.",
            preview: <MiniWebsite colors={["#e9f3e7", "#17382d", "#e5973e"]} />,
          },
          {
            value: "monochrome",
            label: "Monochrome premium",
            description: "Black, ivory and restrained imagery.",
            preview: <MiniWebsite colors={["#e8e8e5", "#111111", "#777777"]} />,
          },
        ]}
      />
      <VisualChoiceGroup
        name="cardStyle"
        title="Card appearance"
        defaultValue={theme.cardStyle || "soft"}
        compact
        options={[
          {
            value: "soft",
            label: "Soft shadow",
            description: "Raised, warm and welcoming.",
            preview: (
              <div className="absolute inset-4 rounded-xl bg-white shadow-xl" />
            ),
          },
          {
            value: "outlined",
            label: "Clean outline",
            description: "Flat and structured.",
            preview: (
              <div className="absolute inset-4 rounded-xl border-2 border-slate-400 bg-white" />
            ),
          },
          {
            value: "glass",
            label: "Glass",
            description: "Translucent and contemporary.",
            preview: (
              <div className="absolute inset-0 bg-gradient-to-br from-rose-100 to-sky-100">
                <div className="absolute inset-4 rounded-xl border border-white/70 bg-white/50 shadow-lg backdrop-blur" />
              </div>
            ),
          },
        ]}
      />
      <VisualChoiceGroup
        name="buttonStyle"
        title="Button shape"
        defaultValue={theme.buttonStyle || "pill"}
        compact
        options={[
          {
            value: "pill",
            label: "Pill",
            description: "Friendly and relaxed.",
            preview: (
              <span className="absolute left-1/2 top-1/2 h-9 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-clay" />
            ),
          },
          {
            value: "rounded",
            label: "Rounded",
            description: "Balanced modern corners.",
            preview: (
              <span className="absolute left-1/2 top-1/2 h-9 w-28 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-clay" />
            ),
          },
          {
            value: "square",
            label: "Sharp",
            description: "Confident editorial edges.",
            preview: (
              <span className="absolute left-1/2 top-1/2 h-9 w-28 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-clay" />
            ),
          },
        ]}
      />
      <VisualChoiceGroup
        name="heroAlignment"
        title="Hero alignment"
        defaultValue={theme.heroAlignment || "left"}
        compact
        options={[
          {
            value: "left",
            label: "Left aligned",
            description: "Classic editorial composition.",
            preview: (
              <div className="absolute inset-0 bg-ink p-5">
                <div className="h-2 w-14 bg-white/50" />
                <div className="mt-3 h-4 w-28 bg-white" />
                <div className="mt-2 h-2 w-20 bg-white/40" />
              </div>
            ),
          },
          {
            value: "center",
            label: "Centered",
            description: "Dramatic and symmetrical.",
            preview: (
              <div className="absolute inset-0 flex flex-col items-center bg-ink p-5">
                <div className="h-2 w-14 bg-white/50" />
                <div className="mt-3 h-4 w-28 bg-white" />
                <div className="mt-2 h-2 w-20 bg-white/40" />
              </div>
            ),
          },
        ]}
      />
      <VisualChoiceGroup
        name="contentWidth"
        title="Content width"
        defaultValue={theme.contentWidth || "comfortable"}
        compact
        options={[
          {
            value: "comfortable",
            label: "Comfortable",
            description: "Focused reading width.",
            preview: (
              <div className="absolute inset-y-3 left-1/2 w-1/2 -translate-x-1/2 rounded bg-white shadow">
                <div className="m-3 h-2 bg-slate-300" />
                <div className="m-3 h-10 bg-slate-100" />
              </div>
            ),
          },
          {
            value: "wide",
            label: "Wide showcase",
            description: "More room for large photography.",
            preview: (
              <div className="absolute inset-3 rounded bg-white shadow">
                <div className="m-3 h-2 bg-slate-300" />
                <div className="m-3 h-10 bg-slate-100" />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}

function SeasonVisualPicker({ defaultValue }: { defaultValue: string }) {
  const seasons = [
    [
      "none",
      "No effect",
      "Clean and distraction-free",
      "☀️",
      "from-stone-100 to-stone-200",
    ],
    [
      "christmas",
      "Christmas",
      "Soft falling snow",
      "❄️",
      "from-emerald-900 to-red-800",
    ],
    [
      "new_year",
      "New Year",
      "Colourful celebration confetti",
      "🎉",
      "from-indigo-900 to-fuchsia-700",
    ],
    [
      "poya",
      "Poya",
      "Calm moonlight and floating petals",
      "🌕",
      "from-slate-900 to-indigo-800",
    ],
    [
      "vesak",
      "Vesak",
      "Warm glowing lanterns",
      "🏮",
      "from-amber-800 to-orange-500",
    ],
    [
      "avurudu",
      "Avurudu",
      "Festive flower petals",
      "🌼",
      "from-orange-500 to-yellow-300",
    ],
    [
      "valentine",
      "Valentine",
      "Floating romantic hearts",
      "♥",
      "from-rose-700 to-pink-300",
    ],
    [
      "halloween",
      "Halloween",
      "Dark atmosphere and embers",
      "🎃",
      "from-neutral-950 to-orange-800",
    ],
  ];
  return (
    <VisualChoiceGroup
      name="seasonalEffect"
      title="Seasonal preset"
      defaultValue={defaultValue}
      options={seasons.map(([value, label, description, icon, gradient]) => ({
        value,
        label,
        description,
        preview: (
          <div
            className={`absolute inset-0 grid place-items-center bg-gradient-to-br ${gradient}`}
          >
            <span className="text-4xl drop-shadow-lg">{icon}</span>
            <span className="absolute bottom-2 left-3 right-3 h-px bg-white/30" />
          </div>
        ),
      }))}
    />
  );
}
