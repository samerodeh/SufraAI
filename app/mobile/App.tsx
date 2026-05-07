import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { CartProvider, useCart } from "./context/CartContext";
import { LanguageProvider, useTranslation } from "./context/LanguageContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import React from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { View, Text, StyleSheet } from "react-native";
import AuthScreen from "./screens/AuthScreen";

import HomeScreen from "./screens/HomeScreen";
import MenuScreen from "./screens/MenuScreen";
import ItemScreen from "./screens/ItemScreen";
import CartScreen from "./screens/CartScreen";
import ChatbotScreen from "./screens/ChatbotScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ReservationScreen from "./screens/ReservationScreen";
import CheckoutScreen from "./screens/CheckoutScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const COLORS = {
  primary: "#C8522A",
  background: "#FDF8F3",
  card: "#FFFFFF",
  muted: "#8C8C8C",
  border: "#E8E0D5",
};

function CartBadge() {
  const { cartCount } = useCart();
  if (cartCount === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{cartCount}</Text>
    </View>
  );
}

function MenuStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MenuList" component={MenuScreen} />
      <Stack.Screen name="Item" component={ItemScreen} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          paddingBottom: 8,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Home: focused ? "home" : "home-outline",
            Menu: focused ? "restaurant" : "restaurant-outline",
            Cart: focused ? "bag" : "bag-outline",
            Chat: focused ? "chatbubble" : "chatbubble-outline",
            Profile: focused ? "person" : "person-outline",
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t("home.title") }} />
      <Tab.Screen name="Menu" component={MenuStack} options={{ tabBarLabel: t("menu.title") }} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: t("cart.title"),
          tabBarIcon: ({ focused, color, size }) => (
            <View>
              <Ionicons name={focused ? "bag" : "bag-outline"} size={size} color={color} />
              <CartBadge />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Chat" component={ChatbotScreen} options={{ tabBarLabel: t("chatbot.title") }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t("profile.title") }} />
    </Tab.Navigator>
  );
}

function AppInner() {
  const { userId, signIn } = useAuth();

  if (!userId) {
    return <AuthScreen onAuth={signIn} />;
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <CartProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen name="Checkout" component={CheckoutScreen} />
              <Stack.Screen name="Reservation" component={ReservationScreen} />
              <Stack.Screen name="OrderStatus" component={require("./screens/OrderStatusScreen").default} />
              <Stack.Screen name="OrderHistory" component={require("./screens/OrderHistoryScreen").default} />
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});