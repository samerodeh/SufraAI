export interface MenuItem {
  id: string;
  name_en: string;
  name_ar: string;
  category: string;
  meal_period: "breakfast" | "lunch" | "all-day";
  description_en: string;
  description_ar: string;
  ingredients: string[];
  allergens: string[];
  diet_tags: string[];
  variants: string[];
  modifications: {
    toppings?: string[];
    spice_level?: string[];
    sauces?: string[];
    add_ons?: string[];
  };
  price: number;
  image_url: string;
  available: boolean;
  isAvailable?: boolean;
}

export interface CartItem {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  quantity: number;
  variant?: string;
  modifications?: string[];
  image_url?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  status: "received" | "preparing" | "ready" | "delivered";
  source: "cart" | "chatbot" | "reorder";
  total: number;
  createdAt: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Reservation {
  userId?: string;
  name: string;
  phone: string;
  dateTime: string;
  partySize: number;
  requests?: string;
  preorderItems?: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  dietary: string[];
  voiceEnabled: boolean;
}

export interface Promo {
  code: string;
  description: string;
  discount: number;
}

export type Category =
  | "all"
  | "manaeesh"
  | "sandwiches"
  | "plates"
  | "mezze"
  | "salads"
  | "sweets"
  | "drinks"
  | "coffee";

export type MealPeriod = "all" | "breakfast" | "lunch" | "all-day";

export type DietTag =
  | "vegan"
  | "vegetarian"
  | "halal"
  | "gluten-free"
  | "no-nuts"
  | "no-dairy";
