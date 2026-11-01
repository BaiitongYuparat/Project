import api from "./api";

const URL_API = "/user";

export type User = {
    id: string;
    email: string;
    name: string | null;
}

export const getUser = async (): Promise<User[]> => {
    const response = await api.get(URL_API);
    return response.data;
}


export const getUsersId = async (id: string): Promise<User> => {
    const response = await api.get(`${URL_API}/${id}`);
    return response.data;
}

export const deleteUser = async (id: string): Promise<void> => {
    await api.delete(`${URL_API}/${id}`);
}

export const createUser = async (data: Omit<User, "name" | "email" | "phone">): Promise<User> => {
    const res = await api.post(URL_API, data);
    return res.data;
}


export const updateUser = async (id: string, data: Partial<Omit<User, "name" | "email" | "phone">>) => {
    const res = await api.put(`${URL_API}/${id}`, data);
    return res.data;
}

export const getMe = async (): Promise<User> => {
  const response = await api.get(`${URL_API}/me`);
  return response.data;
};