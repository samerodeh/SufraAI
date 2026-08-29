export const CATEGORIES = [
  { value: "all", label: "All Items" },
  { value: "manaeesh", label: "Mana'eesh" },
  { value: "sandwiches", label: "Sandwiches" },
  { value: "plates", label: "Plates" },
  { value: "mezze", label: "Mezze" },
  { value: "salads", label: "Salads" },
  { value: "sweets", label: "Sweets" },
  { value: "drinks", label: "Drinks" },
  { value: "coffee", label: "Coffee & Tea" },
] as const;

export const MEAL_PERIODS = [
  { value: "all", label: "All Day" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "all-day", label: "All Day Menu" },
] as const;

export const DIET_TAGS = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "halal", label: "Halal" },
  { value: "gluten-free", label: "Gluten Free" },
] as const;

export const TIP_OPTIONS = [0, 10, 15, 18, 20] as const;

export const TAX_RATE = 0.14975;

export const RESTAURANT_INFO = {
  name: "Sufra",
  tagline: "Authentic Lebanese Cuisine",
  address: "123 Cedar Avenue, Montreal, QC H2T 1S3",
  phone: "+1 (514) 555-0123",
  hours: {
    weekday: "Monday – Friday: 8 AM – 10 PM",
    weekend: "Saturday – Sunday: 9 AM – 11 PM",
  },
  email: "hello@sufra.ca",
} as const;

export const QUICK_REPLIES = [
  "What's on the menu?",
  "Do you have vegan options?",
  "What are today's specials?",
  "I'd like to make a reservation",
] as const;
