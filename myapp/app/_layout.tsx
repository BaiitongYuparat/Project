import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../component/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}