"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Clock, Users, CheckCircle2, Phone } from "lucide-react";
import { createReservation } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { RESTAURANT_INFO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";

const TIME_SLOTS = [
  "12:00", "12:30", "13:00", "13:30", "14:00",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];

const schema = z.object({
  name: z.string().min(2, "Full name is required"),
  phone: z.string().min(7, "Phone number is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Please select a time slot"),
  partySize: z.number().min(2, "Minimum 2 guests").max(50, "Max 50 guests"),
  requests: z.string().optional(),
  preorderItems: z.string().optional(),
});

type ReservationForm = z.infer<typeof schema>;

type ConfirmationData = ReservationForm;

export default function ReservationsPage() {
  const { userId, isAuthenticated } = useAuthStore();
  const [confirmed, setConfirmed] = useState<ConfirmationData | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReservationForm>({
    resolver: zodResolver(schema),
    defaultValues: { partySize: 2 },
  });

  const watchedTime = watch("time");
  const watchedPartySize = watch("partySize");

  const onSubmit = async (data: ReservationForm) => {
    const dateTime = `${data.date}T${data.time}:00`;
    await createReservation({
      userId: userId ?? "guest",
      name: data.name,
      phone: data.phone,
      dateTime,
      partySize: data.partySize,
      requests: data.requests,
      preorderItems: data.preorderItems,
    });
    setConfirmed(data);
  };

  if (confirmed) {
    return (
      <>
        <PageHeader title="Reservation" />
        <div className="page-container py-16 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center space-y-4"
          >
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Reservation confirmed!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ll call you at {confirmed.phone} to confirm.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-left space-y-2">
              {[
                { label: "Name", value: confirmed.name },
                { label: "Date", value: confirmed.date },
                { label: "Time", value: confirmed.time },
                { label: "Guests", value: `${confirmed.partySize} people` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              {confirmed.requests && (
                <div className="pt-2 border-t border-border text-sm">
                  <p className="text-muted-foreground mb-0.5">Special requests</p>
                  <p className="text-foreground">{confirmed.requests}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Questions? Call us at{" "}
              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                className="text-primary hover:underline"
              >
                {RESTAURANT_INFO.phone}
              </a>
            </p>
            <Button
              variant="outline"
              onClick={() => setConfirmed(null)}
              className="w-full"
            >
              Make another reservation
            </Button>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reserve a Table"
        description="Book a table at Sufra. Reservations for groups of 2 or more."
      />

      <div className="page-container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Contact */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name *</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number *</Label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (514) 555-0000"
                    className="pl-8"
                    {...register("phone")}
                    aria-invalid={!!errors.phone}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Date + party size */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date *</Label>
                <div className="relative">
                  <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    className="pl-8"
                    min={new Date().toISOString().split("T")[0]}
                    {...register("date")}
                    aria-invalid={!!errors.date}
                  />
                </div>
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partySize">Guests *</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setValue("partySize", Math.max(2, watchedPartySize - 1))
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    −
                  </button>
                  <div className="flex flex-1 items-center justify-center gap-1.5 h-9 rounded-md border border-border bg-transparent text-sm">
                    <Users size={13} className="text-muted-foreground" />
                    <span className="font-medium tabular-nums">
                      {watchedPartySize}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setValue("partySize", Math.min(50, watchedPartySize + 1))
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    +
                  </button>
                </div>
                {errors.partySize && (
                  <p className="text-xs text-destructive">
                    {errors.partySize.message}
                  </p>
                )}
              </div>
            </div>

            {/* Time slots */}
            <div className="space-y-2">
              <Label>Time *</Label>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setValue("time", slot, { shouldValidate: true })}
                    className={`rounded-md border py-2 text-xs font-medium transition-colors ${
                      watchedTime === slot
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {errors.time && (
                <p className="text-xs text-destructive">{errors.time.message}</p>
              )}
            </div>

            {/* Special requests */}
            <div className="space-y-1.5">
              <Label htmlFor="requests">Special requests</Label>
              <Textarea
                id="requests"
                placeholder="Allergies, accessibility needs, occasion, seating preference…"
                {...register("requests")}
                className="h-24"
              />
            </div>

            {/* Preorder */}
            <div className="space-y-1.5">
              <Label htmlFor="preorderItems">
                Pre-order items{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="preorderItems"
                placeholder="e.g. Zaatar Mana'eesh, Fattoush…"
                {...register("preorderItems")}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll have these ready when you arrive.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full sm:w-auto"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Confirming…" : "Confirm Reservation"}
            </Button>
          </form>

          {/* Sidebar info */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">Restaurant Info</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{RESTAURANT_INFO.address}</p>
                <p>{RESTAURANT_INFO.hours.weekday}</p>
                <p>{RESTAURANT_INFO.hours.weekend}</p>
                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="block text-foreground hover:text-primary transition-colors"
                >
                  {RESTAURANT_INFO.phone}
                </a>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-semibold">Good to know</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>· Minimum party size: 2 guests</li>
                <li>· We hold tables for 15 minutes</li>
                <li>· Large groups ({">"}10) please call us directly</li>
                <li>· Fully halal · No alcohol · No pork</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
