import type { User } from "./userSlice";

const API_URL = import.meta.env.VITE_API_URL;

export type GoogleAuthResponse = {
  token: string;
  user: User;
};

export async function loginWithGoogle(
  idToken: string
): Promise<GoogleAuthResponse > {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Google Login failed");
  }
    localStorage.setItem("token", data.token); // เก็บ token ไว้ชั่วคราว
  return data as GoogleAuthResponse;
}
