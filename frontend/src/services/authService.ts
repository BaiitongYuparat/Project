import type { User } from "./userService";
import api from "./api";

export type GoogleAuthResponse = {
  //token: string;
  user: User;
};

export async function loginWithGoogle(
  idToken: string
): Promise<GoogleAuthResponse > {
  const response = await api.post<GoogleAuthResponse>("/auth/google", {idToken})

  return response.data
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<{ user: User }>("/auth/me");

  return response.data.user;
}