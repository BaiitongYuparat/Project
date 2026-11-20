import api from "./api";
import type { BodyTypeData } from "../store/bodyTypeSlice";

/** ผลวิเคราะห์รูปร่างล่าสุด (404 = ยังไม่เคยวิเคราะห์) */
export const getBodyType = async (): Promise<BodyTypeData> => {
  const response = await api.get<{ data: BodyTypeData }>("/body-type");
  return response.data.data;
};

/** ให้ AI วิเคราะห์รูปร่างจากข้อมูลสัดส่วนล่าสุด แล้วบันทึกผล */
export const analyzeBodyType = async (): Promise<BodyTypeData> => {
  const response = await api.post<{ data: BodyTypeData }>("/body-type/analyze");
  return response.data.data;
};

export type AnalyzeErrorKind = "no_body" | "incomplete" | "no_gender" | "other";

/** แปลง error จาก backend (ข้อความอังกฤษ) เป็นข้อความไทย + ประเภท */
export const analyzeErrorOf = (err: any): { kind: AnalyzeErrorKind; message: string } => {
  const status = err?.response?.status;
  const raw: string = err?.response?.data?.message ?? "";

  if (status === 404 || /body data not found/i.test(raw)) {
    return { kind: "no_body", message: "ยังไม่มีข้อมูลสัดส่วนร่างกาย กรุณากรอกข้อมูลก่อน" };
  }
  if (/incomplete/i.test(raw)) {
    return { kind: "incomplete", message: "ข้อมูลสัดส่วนยังไม่ครบ กรุณากรอกให้ครบทุกช่อง" };
  }
  if (/gender/i.test(raw)) {
    return { kind: "no_gender", message: "กรุณาระบุเพศในข้อมูลส่วนตัวก่อนวิเคราะห์" };
  }
  return { kind: "other", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
};
