import api from "./api";

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
  const response = await api.get("/userconsent");
  return response.data;
};

// ยินยอม ไม่ยินยอม 
export const setConsent = async (consents: ConsentInput[]): Promise<UserConsent> => {
  const response = await api.post("/userconsent", { consents });
  return response.data;
};