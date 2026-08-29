import axios from "axios";
import type { MenuItem, Order, Reservation, UserProfile, Message } from "./types";

const API_BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001"
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ── Menu ──────────────────────────────────────────────────────────────────────

export async function fetchMenu(): Promise<MenuItem[]> {
  const { data } = await client.get<MenuItem[]>("/menu");
  return data;
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export async function fetchFavorites(
  userId: string
): Promise<{ itemId: string }[]> {
  const { data } = await client.get("/favorites", {
    params: { user_id: userId },
  });
  return data;
}

export async function addFavorite(
  userId: string,
  itemId: string
): Promise<void> {
  await client.post("/favorites", { userId, itemId });
}

// ── Promos ────────────────────────────────────────────────────────────────────

export async function fetchPromos(): Promise<
  { code: string; description: string; discount: number }[]
> {
  const { data } = await client.get("/promos/active");
  return data;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function createOrder(payload: {
  userId: string;
  items: {
    id: string;
    name_en: string;
    price: number;
    quantity: number;
    variant?: string;
    modifications?: string[];
  }[];
  source?: string;
}): Promise<Order> {
  const { data } = await client.post<Order>("/orders", payload);
  return data;
}

export async function getOrder(orderId: string): Promise<Order> {
  const { data } = await client.get<Order>(`/orders/${orderId}`);
  return data;
}

export async function getOrderHistory(
  userId: string
): Promise<{ orders: Order[] }> {
  const { data } = await client.get<{ orders: Order[] }>("/orders/history", {
    params: { user_id: userId },
  });
  return data;
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<Order> {
  const { data } = await client.patch<Order>(`/orders/${orderId}/status`, {
    status,
  });
  return data;
}

export async function reorderOrder(
  userId: string,
  orderId: string
): Promise<Order> {
  const { data } = await client.post<Order>("/orders/reorder", {
    userId,
    orderId,
  });
  return data;
}

// ── Reservations ──────────────────────────────────────────────────────────────

export async function createReservation(
  payload: Reservation
): Promise<{ id: string; message: string }> {
  const { data } = await client.post("/reservations", payload);
  return data;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function sendMessage(
  message: string,
  history: Message[],
  userId = "guest"
): Promise<{ response: string }> {
  const { data } = await client.post<{ response: string }>("/chat", {
    message,
    history,
    user_id: userId,
  });
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<{ userId: string; name: string }> {
  const { data } = await client.post("/auth/signup", { name, email, password });
  return data;
}

export async function signIn(
  email: string,
  password: string
): Promise<{ userId: string; name: string }> {
  const { data } = await client.post("/auth/login", { email, password });
  return data;
}

// ── User Profile ──────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data } = await client.get<UserProfile>("/user/profile", {
    params: { user_id: userId },
  });
  return data;
}

export async function updateUserProfile(
  userId: string,
  payload: Partial<UserProfile>
): Promise<UserProfile> {
  const { data } = await client.put<UserProfile>("/user/profile", payload, {
    params: { user_id: userId },
  });
  return data;
}
