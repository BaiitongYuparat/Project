import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../components/auth/AuthProvider";
import { store } from "../store/store";
import { Provider as ReduxProvider } from "react-redux";

export default function RootLayout() {
  return (
    <ReduxProvider store={store}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </ReduxProvider>
  );
}