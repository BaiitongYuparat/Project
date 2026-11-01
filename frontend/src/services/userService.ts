const API_URL = import.meta.env.VITE_API_URL;
import api from "./api";

export type Gender = "MALE" | "FEMALE" | "UNSPECIFIED";

export type User = {
    id: string;
    email: string;
    name: string | null;
    gender: Gender | null;
    
}

export const getMe = async (): Promise<User> => {
  const res = await api.get("/user/me");
  return res.data;
};

export const updateMe = async ( data: Partial<Pick<User, "email" | "name" | "gender">>): Promise<User> => {
  const res = await api.put("/user", data);
  return res.data;
};