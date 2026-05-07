import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from "react-native";
import { useCart } from "../context/CartContext";
import { useTranslation } from "../context/LanguageContext";
import { useNavigation } from "@react-navigation/native";
import { fetchPromos } from "../constants/featuresApi";

const COLORS = {
  primary: "#C8522A", background: "#FDF8F3", card: "#FFFFFF",
  text: "#1A1A1A", muted: "#8C8C8C", border: "#E8E0D5", accent: "#F5EDE3",
};

const TAX_RATE = 0.14975;
const TIP_PRESETS = [0, 10, 15, 18, 20];

export default function CartScreen() {
  const { items, removeItem, clearCart, total, addItem } = useCart();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [tipPct, setTipPct] = useState(15);
  const [promos, setPromos] = useState<any[]>([]);

  React.useEffect(() => {
    fetchPromos().then(setPromos).catch(() => setPromos([]));
  }, []);

  const subtotal = total;
  const tax = subtotal * TAX_RATE;
  const tip = subtotal * (tipPct / 100);
  const grandTotal = subtotal + tax + tip;

  if (items.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.title}>{t("cart.title")}</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🛍️</Text>
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptyText}>Browse the menu and add some delicious dishes!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>{t("cart.title")}</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={s.clearText}>Clear all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {promos.length > 0 && (
          <View style={s.promoCard}>
            <Text style={s.promoTitle}>Active Offers</Text>
            {promos.slice(0, 2).map((p) => (
              <Text key={p.promoId} style={s.promoText}>• {p.title}: {p.description}</Text>
            ))}
          </View>
        )}

        {items.map((item) => (
          <View key={item.id} style={s.row}>
            <View style={s.rowEmoji}>
              <Text style={{ fontSize: 24 }}>🍽️</Text>
            </View>
            <View style={s.rowBody}>
              <Text style={s.rowName}>{item.name_en}</Text>
              {item.variant ? <Text style={s.rowMeta}>{item.variant}</Text> : null}
              {item.modifications?.length ? (
                <Text style={s.rowMeta}>{item.modifications.join(", ")}</Text>
              ) : null}
              <Text style={s.rowPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
            <View style={s.rowRight}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => removeItem(item.id)}>
                <Text style={s.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.qty}>{item.quantity}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => addItem(item)}>
                <Text style={s.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={s.tipSection}>
          <Text style={s.tipTitle}>Add a tip</Text>
          <View style={s.tipRow}>
            {TIP_PRESETS.map((pct) => (
              <TouchableOpacity
                key={pct}
                style={[s.tipBtn, tipPct === pct && s.tipBtnActive]}
                onPress={() => setTipPct(pct)}
              >
                <Text style={[s.tipText, tipPct === pct && s.tipTextActive]}>
                  {pct === 0 ? "No tip" : `${pct}%`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.summary}>
          {[
            { label: "Subtotal", value: subtotal },
            { label: "Tax (QST + GST)", value: tax },
            { label: `Tip (${tipPct}%)`, value: tip },
          ].map((row) => (
            <View key={row.label} style={s.summaryRow}>
              <Text style={s.summaryLabel}>{row.label}</Text>
              <Text style={s.summaryValue}>${row.value.toFixed(2)}</Text>
            </View>
          ))}
          <View style={[s.summaryRow, s.totalRow]}>
            <Text style={s.totalLabel}>{t("cart.total")}</Text>
            <Text style={s.totalAmount}>${grandTotal.toFixed(2)}</Text>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={s.checkoutBtn}
          onPress={() =>
            navigation.navigate("Checkout", { subtotal, tax, tip, tipPct, grandTotal })
          }
        >
          <Text style={s.checkoutText}>
            Proceed to Checkout · ${grandTotal.toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: "700", color: COLORS.text },
  clearText: { fontSize: 14, color: COLORS.primary },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.muted, textAlign: "center", lineHeight: 22 },
  list: { flex: 1, paddingHorizontal: 16 },
  row: { flexDirection: "row", backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", gap: 10 },
  rowEmoji: { width: 48, height: 48, borderRadius: 10, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 3 },
  rowMeta: { fontSize: 11, color: COLORS.muted, marginBottom: 2 },
  rowPrice: { fontSize: 14, fontWeight: "700", color: COLORS.primary, marginTop: 4 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 18, color: COLORS.primary, fontWeight: "700", lineHeight: 22 },
  qty: { fontSize: 16, fontWeight: "600", color: COLORS.text, minWidth: 20, textAlign: "center" },
  promoCard: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, padding: 12, marginBottom: 12 },
  promoTitle: { color: COLORS.primary, fontWeight: "700", marginBottom: 6 },
  promoText: { color: "#7C2D12", fontSize: 12, marginBottom: 2 },
  tipSection: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  tipTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 10 },
  tipRow: { flexDirection: "row", gap: 8 },
  tipBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  tipBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tipText: { fontSize: 12, color: COLORS.muted, fontWeight: "500" },
  tipTextActive: { color: "#fff", fontWeight: "700" },
  summary: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: COLORS.muted },
  summaryValue: { fontSize: 14, color: COLORS.text },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  totalAmount: { fontSize: 18, fontWeight: "700", color: COLORS.primary },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  checkoutBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  checkoutText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
