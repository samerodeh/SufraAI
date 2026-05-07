import { Platform } from "react-native";

// Set EXPO_PUBLIC_API_BASE_URL (e.g. http://192.168.1.50:8001) for physical devices.
const envBaseUrl = ((globalThis as any)?.process?.env?.EXPO_PUBLIC_API_BASE_URL || "").trim();

// Emulator/simulator defaults:
// - Android emulator reaches host via 10.0.2.2
// - iOS simulator/web can use localhost/127.0.0.1
const defaultHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";

export const API_BASE_URL = envBaseUrl || `http://${defaultHost}:8001`;
