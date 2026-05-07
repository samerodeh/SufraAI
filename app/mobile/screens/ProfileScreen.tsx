import React, { useState } from "react";
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, Switch, ScrollView, Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../context/LanguageContext";
import { fetchUserProfile, updateUserProfile, DEFAULT_USER_ID } from "../constants/featuresApi";
import { useThemeMode } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const COLORS = {
  primary: "#C8522A", background: "#FDF8F3", card: "#FFFFFF",
  text: "#1A1A1A", muted: "#8C8C8C", border: "#E8E0D5", accent: "#F5EDE3",
};

const DIETARY_OPTIONS = [
  { key: "vegan", label: "Vegan 🌱" },
  { key: "vegetarian", label: "Vegetarian 🥗" },
  { key: "gluten_free", label: "Gluten Free 🌾" },
  { key: "halal", label: "Halal ✓" },
  { key: "no_nuts", label: "No Nuts 🥜" },
  { key: "no_dairy", label: "No Dairy 🥛" },
];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [dietary, setDietary] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { themeMode, setThemeMode } = useThemeMode();
  const { userName, signOut } = useAuth();

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const profile = await fetchUserProfile(DEFAULT_USER_ID);
        if (!mounted) return;
        const dp = profile?.dietaryProfile || {};
        const tags: string[] = [];
        if (dp.halal) tags.push("halal");
        if (dp.vegan) tags.push("vegan");
        if (Array.isArray(dp.allergies) && dp.allergies.includes("gluten")) tags.push("gluten_free");
        if (Array.isArray(dp.allergies) && dp.allergies.includes("nuts")) tags.push("no_nuts");
        if (Array.isArray(dp.allergies) && dp.allergies.includes("dairy")) tags.push("no_dairy");
        setDietary(tags);
        setVoiceEnabled(Boolean(profile?.voiceEnabled));
      } catch {
        // no-op
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleDietary = (key: string) => {
    setDietary((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const saveProfile = async () => {
    const payload = {
      languagePreference: "en",
      voiceEnabled,
      theme: themeMode,
      dietaryProfile: {
        halal: dietary.includes("halal"),
        vegan: dietary.includes("vegan"),
        allergies: [
          ...(dietary.includes("gluten_free") ? ["gluten"] : []),
          ...(dietary.includes("no_nuts") ? ["nuts"] : []),
          ...(dietary.includes("no_dairy") ? ["dairy"] : []),
          ...allergies,
        ],
      },
    };
    try {
      await updateUserProfile(DEFAULT_USER_ID, payload);
      Alert.alert("Saved", "Preferences updated.");
    } catch {
      Alert.alert("Error", "Could not save preferences.");
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>{t("profile.title")}</Text>
        </View>
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarEmoji}>👤</Text>
          </View>
          <Text style={s.guestText}>{userName || "Guest"}</Text>
          <Text style={s.guestSub}>Logged in to Sufra</Text>
          <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Theme</Text>
          <View style={s.langRow}>
            {(["system", "light", "dark"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[s.dietBtn, themeMode === mode && s.dietBtnActive]}
                onPress={() => setThemeMode(mode)}
              >
                <Text style={[s.dietText, themeMode === mode && s.dietTextActive]}>{mode}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Voice Input</Text>
          <View style={s.langRow}>
            <Text style={s.langLabel}>Enable speech-to-text in chat</Text>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Dietary Preferences</Text>
          <Text style={s.cardSub}>The chatbot will respect these when making suggestions</Text>
          <View style={s.dietGrid}>
            {DIETARY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.dietBtn, dietary.includes(opt.key) && s.dietBtnActive]}
                onPress={() => toggleDietary(opt.key)}
              >
                <Text style={[s.dietText, dietary.includes(opt.key) && s.dietTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.card}>
          <TouchableOpacity style={s.signInBtn} onPress={saveProfile}>
            <Text style={s.signInText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
        <View style={s.card}>
          {[
            { icon: "📦", label: t("profile.orders"), onPress: () => navigation.navigate("OrderHistory") },
            { icon: "🗓️", label: t("profile.reservations"), onPress: () => navigation.navigate("Reservation") },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={[s.menuRow, i > 0 && s.menuRowBorder]} onPress={item.onPress}>
              <Text style={s.menuIcon}>{item.icon}</Text>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Text style={s.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[s.card, s.infoCard]}>
          <Text style={s.infoTitle}>Sufra Restaurant</Text>
          <Text style={s.infoText}>📍 142 Rue Saint-Viateur Ouest, Montreal</Text>
          <Text style={s.infoText}>🕐 Mon–Thu 8AM–11PM · Fri–Sun 8AM–12AM</Text>
          <Text style={s.infoText}>📞 (514) 555-0188</Text>
          <Text style={s.infoText}>✓ Halal Certified · 🚫 No alcohol · 🚫 No pork</Text>
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: COLORS.text },
  avatarSection: { alignItems: "center", paddingVertical: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarEmoji: { fontSize: 36 },
  guestText: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  guestSub: { fontSize: 13, color: COLORS.muted, marginTop: 2, marginBottom: 12 },
  signInBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  signInText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  signOutBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  signOutText: { color: COLORS.muted, fontSize: 14 },
  card: { marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  cardSub: { fontSize: 12, color: COLORS.muted, marginBottom: 12 },
  langRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 },
  langLabel: { fontSize: 15, color: COLORS.muted },
  langActive: { color: COLORS.primary, fontWeight: "600" },
  dietGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  dietBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  dietBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.primary },
  dietText: { fontSize: 13, color: COLORS.muted },
  dietTextActive: { color: COLORS.primary, fontWeight: "600" },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  menuRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text },
  menuArrow: { fontSize: 20, color: COLORS.muted },
  infoCard: { backgroundColor: COLORS.accent },
  infoTitle: { fontSize: 15, fontWeight: "700", color: COLORS.primary, marginBottom: 10 },
  infoText: { fontSize: 13, color: COLORS.muted, marginBottom: 6, lineHeight: 20 },
});