import api from "./api";
import type { User } from "../types/user";

export const getMe = async (): Promise<User> => {
  const res = await api.get("/user/me");
  return res.data;
};

export const updateMe = async ( data: Partial<Pick<User, "email" | "name" | "gender">>): Promise<User> => {
  const res = await api.put("/user", data);
  return res.data;
};