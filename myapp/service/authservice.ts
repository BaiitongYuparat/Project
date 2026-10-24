import axios from "axios";

 const URL_API = "http://193.168.146.84:3000/auth";

export const loginWithGoogle = async (idToken: string) => {
    const response = await axios.post(`${URL_API}/google`, { idToken });
    return response.data;
}
