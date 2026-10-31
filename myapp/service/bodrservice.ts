import api from "./api";

const URL_API = "/body";


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


//เราไม่ดึงid เราจะดึงtoken
export const getBodyData = async (): Promise<BodyData[]> => {
    const response = await api.get(URL_API);
    return response.data;
}

export const getBodyDataById = async (): Promise<BodyData> => {
    const response = await api.get(`${URL_API}/latest`);
    return response.data;
}


export const createBodyData = async (bodyData: Omit<BodyData, 'id' | 'recorded_at'|'user_id' >): Promise<BodyData> => {
    const response = await api.post(URL_API, bodyData);
    return response.data;
}

export const updateBodyData = async (id: string, bodyData: Partial<Omit<BodyData, 'id' | 'user_id' | 'recorded_at'>>): Promise<BodyData> => {
    const response = await api.put(`${URL_API}/${id}`, bodyData);
    return response.data;
}

export const deleteBodyData = async (id: string): Promise<void> => {
    await api.delete(`${URL_API}/${id}`);
}