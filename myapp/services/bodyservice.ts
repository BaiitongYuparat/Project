import axios from "axios";

const URL_API = "http://193.168.146.84:3000/body";

export interface BodyData {
    id: string;
    weight: number;
    height: number;
    chest: number;
    waist: number;
    hips: number;
    user_id: string;
    recorded_at : string;
}

export const getBodyData = async (): Promise<BodyData[]> => {
    const response = await axios.get(URL_API);
    return response.data;
}

export const getBodyDataById = async (id: string): Promise<BodyData> => {
    const response = await axios.get(`${URL_API}/${id}`);
    return response.data;
}


export const createBodyData = async (bodyData: Omit<BodyData, 'id' | 'recorded_at'>): Promise<BodyData> => {
    const response = await axios.post(URL_API, bodyData);
    return response.data;
}

export const updateBodyData = async (id: string, bodyData: Partial<Omit<BodyData, 'id' | 'user_id' | 'recorded_at'>>): Promise<BodyData> => {
    const response = await axios.put(`${URL_API}/${id}`, bodyData);
    return response.data;
}

export const deleteBodyData = async (id: string): Promise<void> => {
    await axios.delete(`${URL_API}/${id}`);
}