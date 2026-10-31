import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin, Search } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { api, formatMoney } from "../services/api";
import type { MenuItem, Restaurant, Category } from "../types";
import { Button, Card, Empty, Input, Loading, Badge } from "../components/ui";
const fallback =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1600&q=85";
const useSettings = () =>
  useQuery<Restaurant>({
    queryKey: ["settings"],
    queryFn: () => api.get("/public/settings"),
  });
const useMenu = () =>
  useQuery<{ items: MenuItem[]; categories: Category[] }>({
    queryKey: ["menu"],
    queryFn: () => api.get("/public/menu?limit=50"),
  });
export function Home() {
  const { data: s } = useSettings();
  const { data: m } = useMenu();
  const { register, handleSubmit, reset, control } = useForm<{
    name: string;
    phone: string;
    email: string;
    partySize: string;
    date: string;
    tableId: string;
    notes: string;
  }>();
  const reservationDate = useWatch({ control, name: "date" });
  const reservationPartySize = useWatch({ control, name: "partySize" });
  const availableTables = useQuery<
    {
      id: string;
      number: string;
      displayName?: string;
      capacity: number;
      zone: string;
    }[]
  >({
    queryKey: ["reservation-tables", reservationDate, reservationPartySize],
    queryFn: () =>
      api.get(
        `/public/reservations/available-tables?date=${encodeURIComponent(new Date(reservationDate).toISOString())}&partySize=${reservationPartySize}`,
      ),
    enabled: Boolean(reservationDate) && Number(reservationPartySize) > 0,
    retry: false,
  });
  const reserve = useMutation({
    mutationFn: (v: unknown) =>
      api.post("/public/reservations", {
        ...(v as object),
        partySize: Number((v as { partySize: string }).partySize),
        date: new Date((v as { date: string }).date).toISOString(),
      }),
    onSuccess: () => {
      toast.success("Reservation request received");
      reset();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <section className="relative flex min-h-[88vh] items-end overflow-hidden bg-ink px-5 pb-20 pt-32 text-white">
        <img
          className="absolute inset-0 size-full object-cover"
          src={s?.heroImageUrl || fallback}
          alt="A beautifully plated restaurant dish"
          style={{ opacity: (s?.websiteTheme?.heroOverlay ?? 55) / 100 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          data-home-hero-content
          className="relative mx-auto w-full max-w-7xl"
        >
          <p className="mb-5 text-xs font-bold uppercase tracking-[.28em] text-amber-200">
            {s?.websiteTheme?.heroEyebrow || "Modern Sri Lankan dining"}
          </p>
          <h1 className="max-w-4xl font-serif text-6xl leading-[.95] md:text-8xl">
            {s?.websiteTheme?.heroTitle || "Fire, spice, island soul."}
          </h1>
          <p className="mt-7 max-w-xl text-lg text-white/75">
            {s?.description ||
              "A contemporary expression of Sri Lanka, built around the island harvest and the theatre of an open flame."}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/menu"
              className="rounded-full bg-white px-6 py-3 font-semibold text-ink"
            >
              Explore the menu
            </Link>
            <a
              href="#reserve"
              className="rounded-full border border-white/40 px-6 py-3 font-semibold"
            >
              Reserve a table
            </a>
          </div>
        </motion.div>
      </section>
      <section className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.25em] text-clay">
                Chef's selection
              </p>
              <h2 className="mt-3 font-serif text-4xl md:text-6xl">
                Made to remember
              </h2>
            </div>
            <Link
              className="hidden items-center gap-2 font-semibold md:flex"
              to="/menu"
            >
              Full menu <ArrowRight size={18} />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {m?.items
              .filter((i) => i.featured)
              .slice(0, 3)
              .map((item, i) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  viewport={{ once: true }}
                >
                  <Card className="overflow-hidden">
                    <img
                      className="h-64 w-full object-cover"
                      src={item.imageUrl || fallback}
                      alt={item.name}
                    />
                    <div className="p-6">
                      <div className="flex justify-between gap-3">
                        <h3 className="font-serif text-2xl">{item.name}</h3>
                        <span className="font-semibold text-clay">
                          {formatMoney(item.basePrice, s?.currency)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-ink/60">
                        {item.description}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
          </div>
        </div>
      </section>
      <section id="story" className="bg-sage px-5 py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2 md:items-center">
          <img
            className="h-[520px] w-full rounded-[2rem] object-cover"
            src={
              s?.websiteTheme?.storyImageUrl ||
              "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1000&q=85"
            }
            alt="Warm restaurant dining room"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-amber-200">
              {s?.websiteTheme?.storyEyebrow || "Our story"}
            </p>
            <h2 className="mt-4 font-serif text-5xl">
              {s?.websiteTheme?.storyTitle || "Rooted here. Looking forward."}
            </h2>
            <p className="mt-7 max-w-lg leading-8 text-white/70">
              {s?.websiteTheme?.storyText ||
                "We cook with memory and curiosity—local produce, old techniques, new rhythm. Every plate begins with a relationship to a grower, fisher or maker."}
            </p>
          </div>
        </div>
      </section>
      <section id="reserve" className="px-5 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-clay">
              Reservations
            </p>
            <h2 className="mt-4 font-serif text-5xl">Your table awaits.</h2>
            <p className="mt-5 text-ink/60">
              Join us for lunch or dinner. We’ll confirm your table after
              reviewing availability.
            </p>
          </div>
          <Card className="p-6 md:p-9">
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={handleSubmit((v) => reserve.mutate(v))}
            >
              <Input
                placeholder="Your name"
                {...register("name", { required: true })}
              />
              <Input
                placeholder="Phone"
                {...register("phone", { required: true })}
              />
              <Input
                type="email"
                placeholder="Email (optional)"
                {...register("email")}
              />
              <Input
                type="number"
                min="1"
                max="20"
                placeholder="Party size"
                {...register("partySize", { required: true })}
              />
              <Input
                type="datetime-local"
                {...register("date", { required: true })}
              />
              <select
                aria-label="Choose an available table"
                disabled={
                  !reservationDate ||
                  !reservationPartySize ||
                  availableTables.isLoading
                }
                className="focus-ring w-full rounded-xl border border-black/10 bg-paper px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                {...register("tableId", { required: true })}
              >
                <option value="">
                  {!reservationDate || !reservationPartySize
                    ? "Choose date and party size first"
                    : availableTables.isLoading
                      ? "Checking available tables…"
                      : "Select your table"}
                </option>
                {availableTables.data?.map((table) => (
                  <option value={table.id} key={table.id}>
                    {table.displayName || `Table ${table.number}`} ·{" "}
                    {table.zone} · seats {table.capacity}
                  </option>
                ))}
              </select>
              {availableTables.data?.length === 0 && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 md:col-span-2">
                  No table fits that time and party size. Please choose another
                  time.
                </p>
              )}
              <Input
                className="md:col-span-2"
                placeholder="Notes or occasion"
                {...register("notes")}
              />
              <Button disabled={reserve.isPending} className="md:col-span-2">
                {reserve.isPending
                  ? "Checking availability…"
                  : "Request reservation"}
              </Button>
            </form>
          </Card>
        </div>
      </section>
      <section id="visit" className="border-t border-black/10 px-5 py-16">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row">
          <div className="flex gap-3">
            <MapPin className="text-clay" />
            <div>
              <p className="font-semibold">
                {s?.address || "Colombo, Sri Lanka"}
              </p>
              {s?.mapUrl && (
                <a className="text-sm text-clay" href={s.mapUrl}>
                  Open map
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="text-clay" />
            <div>
              <p className="font-semibold">Open daily</p>
              <p className="text-sm text-ink/60">Lunch & dinner</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function PublicMenu() {
  const { data, isLoading, error } = useMenu();
  const { data: s } = useSettings();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const items = useMemo(
    () =>
      data?.items.filter(
        (i) =>
          (cat === "all" || i.category?._id === cat) &&
          `${i.name} ${i.description} ${i.ingredients.join(" ")}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ) || [],
    [data, q, cat],
  );
  if (isLoading)
    return (
      <div className="pt-28">
        <Loading />
      </div>
    );
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-5 pb-24 pt-32">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-clay">
        Seasonal menu
      </p>
      <h1 className="mt-3 font-serif text-5xl md:text-7xl">
        Choose your craving.
      </h1>
      <div className="mt-10 flex flex-col gap-4 md:flex-row">
        <label className="relative max-w-md flex-1">
          <Search className="absolute left-4 top-3.5 text-ink/40" size={19} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-11"
            placeholder="Search dishes or ingredients"
          />
        </label>
        <div className="flex gap-2 overflow-auto pb-2">
          <button
            onClick={() => setCat("all")}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${cat === "all" ? "bg-ink text-white" : "bg-black/5"}`}
          >
            All
          </button>
          {data?.categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setCat(c._id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${cat === c._id ? "bg-ink text-white" : "bg-black/5"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <Empty title="Menu unavailable" body={error.message} />
      ) : items.length ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item._id} className="flex overflow-hidden">
              <img
                className="w-32 object-cover sm:w-44"
                src={item.imageUrl || fallback}
                alt={item.name}
              />
              <div className="flex-1 p-5">
                <div className="flex justify-between gap-3">
                  <h2 className="font-serif text-2xl">{item.name}</h2>
                  <span className="font-semibold">
                    {formatMoney(item.basePrice, s?.currency)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink/60">{item.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.dietaryLabels.map((x) => (
                    <Badge key={x}>{x}</Badge>
                  ))}
                  {item.soldOut && <Badge tone="bad">Sold out</Badge>}
                </div>
                {item.allergens.length > 0 && (
                  <p className="mt-3 text-xs text-ink/50">
                    Contains: {item.allergens.join(", ")}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-10">
          <Empty
            title="No dishes found"
            body="Try another search or category."
          />
        </div>
      )}
    </div>
  );
}
