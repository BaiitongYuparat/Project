import axios from "axios";
import { Platform } from "react-native";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const URL_API = `${BASE_URL}/auth`;

export const loginWithGoogle = async (idToken: string) => {
    try {
        const response = await axios.post(`${URL_API}/google`, { idToken , platform: "mobile" });
        return response.data;
    } catch (error: any) {
        console.log("AUTH API:", error.response?.status, error.response?.data);
        throw error;
    }
};

export const logout = async () => {
    try {
        await axios.post(`${URL_API}/logout`);
    }catch (error: any) {
        console.log("LOGOUT API:", error.response?.status, error.response?.data);
        throw error;
    }
}