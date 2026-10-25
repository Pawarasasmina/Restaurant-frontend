import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "react-router-dom";
import { Menu as MenuIcon, UtensilsCrossed } from "lucide-react";
import { api } from "../services/api";
import type { Restaurant } from "../types";

export function PublicSiteLayout() {
  const [open, setOpen] = useState(false);
  const { data: settings } = useQuery<Restaurant>({
    queryKey: ["settings"],
    queryFn: () => api.get("/public/settings"),
    refetchInterval: 30000,
  });
  const theme = settings?.websiteTheme;
  const effect = theme?.seasonalEnabled
    ? theme.seasonalEffect || "none"
    : "none";
  const hasAnnouncement = Boolean(
    theme?.announcementEnabled && theme.announcement,
  );
  return (
    <div
      className={`public-site min-h-screen season-${effect} style-${theme?.stylePreset || "signature"} hero-${theme?.heroAlignment || "left"} content-${theme?.contentWidth || "comfortable"}`}
      data-card-style={theme?.cardStyle || "soft"}
      data-button-style={theme?.buttonStyle || "pill"}
      style={
        { "--brand-color": settings?.brandColor || "#8c3b2a" } as CSSProperties
      }
    >
      <SeasonalEffect effect={effect} />
      {hasAnnouncement && (
        <div className="fixed inset-x-0 top-0 z-50 bg-[var(--brand-color)] px-4 py-2 text-center text-sm font-semibold text-white">
          {theme?.announcement}
        </div>
      )}
      <header
        className={`glass fixed inset-x-0 z-40 border-b border-black/5 ${hasAnnouncement ? "top-9" : "top-0"}`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-3 font-serif text-xl">
            {settings?.logoUrl ? (
              <img
                className="size-11 rounded-full object-cover"
                src={settings.logoUrl}
                alt=""
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-[var(--brand-color)] text-white">
                <UtensilsCrossed size={18} />
              </span>
            )}
            {settings?.name || "Saffron & Stone"}
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link to="/menu">Menu</Link>
            <a href="/#story">Our story</a>
            <a href="/#visit">Visit</a>
            <Link
              className="rounded-full bg-ink px-5 py-2.5 text-white"
              to="/#reserve"
            >
              Reserve a table
            </Link>
          </nav>
          <button
            aria-label="Toggle menu"
            className="md:hidden"
            onClick={() => setOpen(!open)}
          >
            <MenuIcon />
          </button>
        </div>
        {open && (
          <nav className="grid gap-4 border-t bg-paper px-5 py-5 md:hidden">
            <Link to="/menu">Menu</Link>
            <a href="/#story">Our story</a>
            <a href="/#reserve">Reservations</a>
          </nav>
        )}
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="bg-ink px-5 py-12 text-cream">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row">
          <div>
            <p className="font-serif text-2xl">
              {settings?.name || "Saffron & Stone"}
            </p>
            <p className="mt-2 text-sm text-cream/60">
              Fire, spice, island soul.
            </p>
          </div>
          <div className="text-sm text-cream/60">
            <p>{settings?.address || "Colombo, Sri Lanka"}</p>
            <p className="mt-2">
              © {new Date().getFullYear()} {settings?.name || "Saffron & Stone"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SeasonalEffect({ effect }: { effect: string }) {
  if (effect === "none") return null;
  const count = ["christmas", "new_year", "avurudu"].includes(effect)
    ? 42
    : effect === "vesak"
      ? 22
      : 18;
  return (
    <div className={`seasonal-layer seasonal-${effect}`} aria-hidden="true">
      {effect === "poya" && <span className="poya-moon" />}
      {Array.from({ length: count }, (_, index) => (
        <span
          className="seasonal-particle"
          key={index}
          style={
            {
              "--particle-left": `${(index * 37) % 100}%`,
              "--particle-delay": `${-((index * 0.47) % 9)}s`,
              "--particle-duration": `${6 + (index % 7)}s`,
              "--particle-hue": `${(index * 47) % 360}`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
