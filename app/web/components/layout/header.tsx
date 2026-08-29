"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User, Menu, X, MessageCircle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCartStore, selectItemCount } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { CartSheet } from "@/components/cart/cart-sheet";

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/chat", label: "Ask SufraAI" },
  { href: "/reservations", label: "Reserve a Table" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const itemCount = useCartStore(selectItemCount);
  const { isAuthenticated, userName } = useAuthStore();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="page-container flex h-14 items-center justify-between">
          {/* Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-foreground transition-opacity hover:opacity-80"
          >
            <span className="font-semibold text-[15px] tracking-tight text-primary">
              Sufra
            </span>
            <span className="hidden text-[11px] text-muted-foreground font-normal sm:block">
              Lebanese Kitchen
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3 py-1.5 text-[13px] rounded-md transition-colors",
                  pathname.startsWith(link.href)
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                )}
              >
                {pathname.startsWith(link.href) && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-md bg-secondary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              aria-label={`Open cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
            >
              <ShoppingBag size={16} />
              <span className="hidden sm:inline">Cart</span>
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key="cart-count"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0.5, duration: 0.35 }}
                    className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Profile / Auth */}
            <Link
              href={isAuthenticated ? "/profile" : "/auth"}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            >
              <User size={16} />
              <span className="hidden sm:inline">
                {isAuthenticated ? userName.split(" ")[0] : "Sign in"}
              </span>
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              aria-label="Toggle navigation"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -45, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 45, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X size={17} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: 45, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -45, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu size={17} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="md:hidden overflow-hidden border-t border-border"
            >
              <nav className="page-container flex flex-col gap-0.5 py-2 pb-3">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2 text-[13px] transition-colors",
                      pathname.startsWith(link.href)
                        ? "bg-secondary text-foreground font-medium"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
