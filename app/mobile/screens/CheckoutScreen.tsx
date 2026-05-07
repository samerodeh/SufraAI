import React, { useState, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../context/CartContext";
import { createOrder, DEFAULT_USER_ID } from "../constants/featuresApi";

const COLORS = {
  primary: "#C8522A", background: "#FDF8F3", card: "#FFFFFF",
  text: "#1A1A1A", muted: "#8C8C8C", border: "#E8E0D5", accent: "#F5EDE3",
  success: "#16A34A", error: "#DC2626",
};

type CardType = "visa" | "mastercard" | "amex" | "discover" | "unknown";

function getCardType(number: string): CardType {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6(?:011|5)/.test(n)) return "discover";
  return "unknown";
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

const CARD_LABELS: Record<CardType, string> = {
  visa: "VISA", mastercard: "MC", amex: "AMEX", discover: "DISC", unknown: "",
};
const CARD_COLORS: Record<CardType, string> = {
  visa: "#1A1F71", mastercard: "#EB001B", amex: "#016FD0", discover: "#FF6600", unknown: COLORS.muted,
};

function CardTypeTag({ type }: { type: CardType }) {
  if (type === "unknown") return null;
  return (
    <Text style={[s.cardTag, { color: CARD_COLORS[type] }]}>{CARD_LABELS[type]}</Text>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const VALID_PROMOS: Record<string, number> = {
  SUFRA10: 0.10,
  WELCOME15: 0.15,
  FALAFEL5: 0.05,
};

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { items, clearCart } = useCart();

  const { subtotal = 0, tax = 0, tip = 0, tipPct = 0, grandTotal = 0 } = route.params ?? {};

  // Fulfillment
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [street, setStreet] = useState("");
  const [apt, setApt] = useState("");
  const [city, setCity] = useState("");
  const [instructions, setInstructions] = useState("");

  // Promo
  const [promoInput, setPromoInput] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState("");
  const [promoError, setPromoError] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cvvVisible, setCvvVisible] = useState(false);

  // State
  const [placing, setPlacing] = useState(false);

  const expiryRef = useRef<TextInput>(null);
  const cvvRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);

  const cardType = getCardType(cardNumber);
  const discountAmount = subtotal * promoDiscount;
  const finalTotal = grandTotal - discountAmount;

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (VALID_PROMOS[code]) {
      setPromoDiscount(VALID_PROMOS[code]);
      setPromoApplied(code);
      setPromoError("");
    } else {
      setPromoError("Invalid promo code.");
      setPromoDiscount(0);
      setPromoApplied("");
    }
  }

  function removePromo() {
    setPromoDiscount(0);
    setPromoApplied("");
    setPromoInput("");
    setPromoError("");
  }

  function validate(): string | null {
    if (fulfillment === "delivery") {
      if (!street.trim()) return "Please enter your street address.";
      if (!city.trim()) return "Please enter your city.";
    }
    if (paymentMethod === "card") {
      if (!cardName.trim()) return "Please enter the cardholder name.";
      const digits = cardNumber.replace(/\s/g, "");
      if (digits.length < 15) return "Please enter a valid card number.";
      if (expiry.length < 5) return "Please enter a valid expiry date.";
      const [mm, yy] = expiry.split("/").map(Number);
      const now = new Date();
      const expDate = new Date(2000 + yy, mm - 1);
      if (mm < 1 || mm > 12 || expDate < now) return "Your card has expired or the date is invalid.";
      const cvvLen = cardType === "amex" ? 4 : 3;
      if (cvv.length < cvvLen) return `Please enter a valid ${cvvLen}-digit CVV.`;
    }
    return null;
  }

  async function handlePlaceOrder() {
    const err = validate();
    if (err) {
      Alert.alert("Missing information", err);
      return;
    }

    setPlacing(true);
    try {
      const deliveryAddress =
        fulfillment === "delivery"
          ? [street.trim(), apt.trim(), city.trim()].filter(Boolean).join(", ")
          : undefined;

      const order = await createOrder({
        userId: DEFAULT_USER_ID,
        source: "cart",
        items: items.map((x) => ({
          itemId: x.id,
          name: x.name_en,
          quantity: x.quantity,
          price: x.price,
        })),
        paymentMethod,
        deliveryMethod: fulfillment,
        deliveryAddress,
        promoCode: promoApplied || undefined,
        subtotal,
        tax,
        tip,
        total: finalTotal,
      });

      clearCart();
      navigation.replace("OrderStatus", { orderId: order.orderId });
    } catch {
      Alert.alert("Error", "Could not place your order. Please try again.");
      setPlacing(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Checkout</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order Summary */}
          <View style={s.card}>
            <SectionHeader title="Order Summary" />
            {items.map((item) => (
              <View key={item.id} style={s.summaryItem}>
                <View style={s.summaryItemLeft}>
                  <Text style={s.summaryQty}>{item.quantity}×</Text>
                  <View>
                    <Text style={s.summaryName}>{item.name_en}</Text>
                    {item.variant ? <Text style={s.summaryMeta}>{item.variant}</Text> : null}
                  </View>
                </View>
                <Text style={s.summaryPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Fulfillment */}
          <View style={s.card}>
            <SectionHeader title="Fulfillment" />
            <View style={s.toggle}>
              {(["pickup", "delivery"] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.toggleBtn, fulfillment === opt && s.toggleBtnActive]}
                  onPress={() => setFulfillment(opt)}
                >
                  <Ionicons
                    name={opt === "pickup" ? "storefront-outline" : "bicycle-outline"}
                    size={16}
                    color={fulfillment === opt ? "#fff" : COLORS.muted}
                  />
                  <Text style={[s.toggleText, fulfillment === opt && s.toggleTextActive]}>
                    {opt === "pickup" ? "Pickup" : "Delivery"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {fulfillment === "pickup" && (
              <View style={s.pickupInfo}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={s.pickupText}>142 Rue Saint-Viateur Ouest, Montreal</Text>
              </View>
            )}

            {fulfillment === "delivery" && (
              <View style={{ marginTop: 12, gap: 10 }}>
                <Field label="Street Address *">
                  <TextInput
                    style={s.input}
                    placeholder="123 Main Street"
                    placeholderTextColor={COLORS.muted}
                    value={street}
                    onChangeText={setStreet}
                    returnKeyType="next"
                    onSubmitEditing={() => cityRef.current?.focus()}
                  />
                </Field>
                <Field label="Apt / Suite (optional)">
                  <TextInput
                    style={s.input}
                    placeholder="Apt 4B"
                    placeholderTextColor={COLORS.muted}
                    value={apt}
                    onChangeText={setApt}
                    returnKeyType="next"
                  />
                </Field>
                <Field label="City *">
                  <TextInput
                    ref={cityRef}
                    style={s.input}
                    placeholder="Montreal"
                    placeholderTextColor={COLORS.muted}
                    value={city}
                    onChangeText={setCity}
                    returnKeyType="done"
                  />
                </Field>
                <Field label="Delivery Instructions (optional)">
                  <TextInput
                    style={[s.input, s.inputMulti]}
                    placeholder="Leave at door, ring bell once..."
                    placeholderTextColor={COLORS.muted}
                    value={instructions}
                    onChangeText={setInstructions}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </Field>
              </View>
            )}
          </View>

          {/* Promo Code */}
          <View style={s.card}>
            <SectionHeader title="Promo Code" />
            {promoApplied ? (
              <View style={s.promoApplied}>
                <View style={s.promoAppliedLeft}>
                  <Ionicons name="pricetag" size={16} color={COLORS.success} />
                  <Text style={s.promoAppliedText}>
                    {promoApplied} — {Math.round(promoDiscount * 100)}% off applied
                  </Text>
                </View>
                <TouchableOpacity onPress={removePromo}>
                  <Ionicons name="close-circle" size={20} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={s.promoRow}>
                  <TextInput
                    style={[s.input, s.promoInput]}
                    placeholder="Enter code (e.g. SUFRA10)"
                    placeholderTextColor={COLORS.muted}
                    value={promoInput}
                    onChangeText={(v) => { setPromoInput(v); setPromoError(""); }}
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={applyPromo}
                  />
                  <TouchableOpacity style={s.promoBtn} onPress={applyPromo}>
                    <Text style={s.promoBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
                {promoError ? <Text style={s.promoError}>{promoError}</Text> : null}
              </View>
            )}
          </View>

          {/* Payment Method */}
          <View style={s.card}>
            <SectionHeader title="Payment" />
            <View style={s.toggle}>
              {(["card", "cash"] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.toggleBtn, paymentMethod === opt && s.toggleBtnActive]}
                  onPress={() => setPaymentMethod(opt)}
                >
                  <Ionicons
                    name={opt === "card" ? "card-outline" : "cash-outline"}
                    size={16}
                    color={paymentMethod === opt ? "#fff" : COLORS.muted}
                  />
                  <Text style={[s.toggleText, paymentMethod === opt && s.toggleTextActive]}>
                    {opt === "card" ? "Credit / Debit" : "Cash on Pickup"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentMethod === "cash" && (
              <View style={s.cashNote}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                <Text style={s.cashNoteText}>Pay in cash when you pick up your order.</Text>
              </View>
            )}

            {paymentMethod === "card" && (
              <View style={{ marginTop: 16, gap: 12 }}>
                {/* Card Number */}
                <Field label="Card Number">
                  <View style={s.cardNumberRow}>
                    <TextInput
                      style={[s.input, s.cardNumberInput]}
                      placeholder="0000 0000 0000 0000"
                      placeholderTextColor={COLORS.muted}
                      value={cardNumber}
                      onChangeText={(v) => {
                        const formatted = formatCardNumber(v);
                        setCardNumber(formatted);
                        if (formatted.replace(/\s/g, "").length >= 16) expiryRef.current?.focus();
                      }}
                      keyboardType="number-pad"
                      maxLength={19}
                    />
                    <CardTypeTag type={cardType} />
                  </View>
                </Field>

                {/* Cardholder Name */}
                <Field label="Cardholder Name">
                  <TextInput
                    style={s.input}
                    placeholder="Name as on card"
                    placeholderTextColor={COLORS.muted}
                    value={cardName}
                    onChangeText={setCardName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => expiryRef.current?.focus()}
                  />
                </Field>

                {/* Expiry + CVV */}
                <View style={s.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Field label="Expiry">
                      <TextInput
                        ref={expiryRef}
                        style={s.input}
                        placeholder="MM/YY"
                        placeholderTextColor={COLORS.muted}
                        value={expiry}
                        onChangeText={(v) => {
                          const formatted = formatExpiry(v);
                          setExpiry(formatted);
                          if (formatted.length === 5) cvvRef.current?.focus();
                        }}
                        keyboardType="number-pad"
                        maxLength={5}
                        returnKeyType="next"
                      />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="CVV">
                      <View style={s.cvvRow}>
                        <TextInput
                          ref={cvvRef}
                          style={[s.input, { flex: 1 }]}
                          placeholder={cardType === "amex" ? "0000" : "000"}
                          placeholderTextColor={COLORS.muted}
                          value={cvv}
                          onChangeText={setCvv}
                          keyboardType="number-pad"
                          maxLength={cardType === "amex" ? 4 : 3}
                          secureTextEntry={!cvvVisible}
                          returnKeyType="done"
                        />
                        <TouchableOpacity
                          style={s.cvvEye}
                          onPress={() => setCvvVisible((v) => !v)}
                        >
                          <Ionicons
                            name={cvvVisible ? "eye-off-outline" : "eye-outline"}
                            size={18}
                            color={COLORS.muted}
                          />
                        </TouchableOpacity>
                      </View>
                    </Field>
                  </View>
                </View>

                <View style={s.secureNote}>
                  <Ionicons name="lock-closed-outline" size={13} color={COLORS.muted} />
                  <Text style={s.secureText}>Your payment info is encrypted and secure.</Text>
                </View>
              </View>
            )}
          </View>

          {/* Bill Summary */}
          <View style={s.card}>
            <SectionHeader title="Bill" />
            {[
              { label: "Subtotal", value: subtotal },
              { label: "Tax (QST + GST)", value: tax },
              { label: `Tip (${tipPct}%)`, value: tip },
            ].map((row) => (
              <View key={row.label} style={s.billRow}>
                <Text style={s.billLabel}>{row.label}</Text>
                <Text style={s.billValue}>${row.value.toFixed(2)}</Text>
              </View>
            ))}
            {promoDiscount > 0 && (
              <View style={s.billRow}>
                <Text style={[s.billLabel, { color: COLORS.success }]}>
                  Promo ({promoApplied})
                </Text>
                <Text style={[s.billValue, { color: COLORS.success }]}>
                  −${discountAmount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={s.billDivider} />
            <View style={s.billRow}>
              <Text style={s.billTotal}>Total</Text>
              <Text style={s.billTotalAmount}>${finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Place Order Footer */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.placeBtn, placing && s.placeBtnLoading]}
            onPress={handlePlaceOrder}
            disabled={placing}
          >
            {placing ? (
              <View style={s.placingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.placeBtnText}>Processing...</Text>
              </View>
            ) : (
              <Text style={s.placeBtnText}>
                Place Order · ${finalTotal.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionHeader: {
    fontSize: 13, fontWeight: "700", color: COLORS.muted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14,
  },

  // Order Summary
  summaryItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  summaryItemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  summaryQty: { fontSize: 13, fontWeight: "700", color: COLORS.muted, minWidth: 24 },
  summaryName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  summaryMeta: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  summaryPrice: { fontSize: 14, fontWeight: "600", color: COLORS.text },

  // Toggle
  toggle: { flexDirection: "row", backgroundColor: COLORS.background, borderRadius: 10, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 8, gap: 6 },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  toggleTextActive: { color: "#fff" },

  // Pickup
  pickupInfo: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: COLORS.accent, borderRadius: 8, padding: 10 },
  pickupText: { fontSize: 13, color: COLORS.text, flex: 1 },

  // Cash
  cashNote: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: COLORS.accent, borderRadius: 8, padding: 10 },
  cashNoteText: { fontSize: 13, color: COLORS.text, flex: 1 },

  // Fields
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text,
  },
  inputMulti: { height: 80, paddingTop: 12 },

  // Card
  cardNumberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardNumberInput: { flex: 1, letterSpacing: 2 },
  cardTag: { fontSize: 13, fontWeight: "800", minWidth: 36, textAlign: "center" },
  cardRow: { flexDirection: "row", gap: 12 },
  cvvRow: { flexDirection: "row", alignItems: "center" },
  cvvEye: { position: "absolute", right: 12 },
  secureNote: { flexDirection: "row", alignItems: "center", gap: 5 },
  secureText: { fontSize: 11, color: COLORS.muted },

  // Promo
  promoRow: { flexDirection: "row", gap: 8 },
  promoInput: { flex: 1 },
  promoBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  promoBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  promoApplied: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F0FDF4", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#BBF7D0" },
  promoAppliedLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  promoAppliedText: { fontSize: 13, fontWeight: "600", color: COLORS.success },
  promoError: { fontSize: 12, color: COLORS.error, marginTop: 6 },

  // Bill
  billRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  billLabel: { fontSize: 14, color: COLORS.muted },
  billValue: { fontSize: 14, color: COLORS.text },
  billDivider: { borderTopWidth: 1, borderTopColor: COLORS.border, marginVertical: 10 },
  billTotal: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  billTotalAmount: { fontSize: 18, fontWeight: "700", color: COLORS.primary },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  placeBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  placeBtnLoading: { opacity: 0.75 },
  placingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  placeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
