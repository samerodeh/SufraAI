import Link from "next/link";
import { RESTAURANT_INFO } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="page-container py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <p className="text-[15px] font-semibold text-primary">Sufra</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {RESTAURANT_INFO.tagline}
            </p>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-xs">
              Fresh, halal Lebanese food prepared daily. No alcohol, no pork —
              just honest cooking and warm hospitality.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-medium text-foreground uppercase tracking-wider mb-3">
              Explore
            </p>
            <ul className="space-y-2">
              {[
                { href: "/menu", label: "Menu" },
                { href: "/reservations", label: "Book a Table" },
                { href: "/chat", label: "Ask SufraAI" },
                { href: "/orders/history", label: "My Orders" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-medium text-foreground uppercase tracking-wider mb-3">
              Visit Us
            </p>
            <address className="not-italic space-y-2">
              <p className="text-sm text-muted-foreground">
                {RESTAURANT_INFO.address}
              </p>
              <p className="text-sm text-muted-foreground">
                {RESTAURANT_INFO.hours.weekday}
              </p>
              <p className="text-sm text-muted-foreground">
                {RESTAURANT_INFO.hours.weekend}
              </p>
              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {RESTAURANT_INFO.phone}
              </a>
            </address>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sufra. All rights reserved.
          </p>
          <div className="flex gap-1">
            {["Halal Certified", "No Alcohol", "No Pork"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
