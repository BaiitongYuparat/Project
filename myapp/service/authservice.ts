import api from "./api";

const URL_API = "/auth";


export const loginWithGoogle = async (idToken: string) => {
    try {
        const response = await api.post(`${URL_API}/google`, { idToken , platform: "mobile" });
        return response.data;
    } catch (error: any) {
        console.log("AUTH API:", error.response?.status, error.response?.data);
        throw error;
    }
};

export const logout = async () => {
    try {
        await api.post(`${URL_API}/logout`);
    }catch (error: any) {
        console.log("LOGOUT API:", error.response?.status, error.response?.data);
        throw error;
    }
}