import type { User } from "./userSlice";
import api from "./api";

export type GoogleAuthResponse = {
  token: string;
  user: User;
};

export async function loginWithGoogle(
  idToken: string
): Promise<GoogleAuthResponse > {
  const response = await api.post<GoogleAuthResponse>("/auth/google", {idToken})
  const data = response.data;
  localStorage.setItem("token", data.token) //เก็บไว้ชั่วคราว

  return data
}