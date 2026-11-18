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


export const deleteUserById = async (id: string): Promise<void> => {
  await api.delete(`/user/${id}`);
}

export const createUser = async (data: Pick<User, "email" | "name" | "gender">): Promise<User> => {
  const res = await api.post("/user", data);
  return res.data;
}

export const updateUser = async (id: string, data: Partial<Pick<User, "email" | "name" | "gender">>): Promise<User> => {
  const res = await api.put(`/user/${id}`, data);
  return res.data;
}

export const getUsers = async (): Promise<User[]> => {
  // Super Admin ดึงรายชื่อ shopper ผ่าน API ฝั่งผู้ดูแล (session admin_token)
  const res = await api.get("/admin/users");
  return res.data;
};

export const setUserActive = async (id: string, isActive: boolean): Promise<User> => {
    const res = await api.patch(`/user/${id}/status`, { isActive });
    return res.data;
};

export const updateUserStatus = async ( id: string, status: "active" | "suspended") => {
  const res = await api.put(`/admin/users/${id}/status`, { status });
  return res.data;
};

export const deleteUser = async (id: string) => {
  const res = await api.delete(`/admin/users/${id}`);
  return res.data;
};