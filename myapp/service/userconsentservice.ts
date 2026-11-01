import api from "./api";

const URL_API = "/userconsent";

export type ConsentType = "body_data" | "photo_analysis";

export type UserConsent = {
    id: string;
    user_id: string;
    type: ConsentType;
    granted: boolean;
    granted_at: string;
    revoked_at: string | null;
}

export type ConsentInput = { type: ConsentType; granted: boolean };

export const getConsents = async (): Promise<UserConsent[]> => {
  const response = await api.get(URL_API);
  return response.data;
};

// ยินยอม ไม่ยินยอม 
export const setConsent = async (consents: ConsentInput[]): Promise<UserConsent> => {
  const response = await api.post(URL_API, { consents });
  return response.data;
};