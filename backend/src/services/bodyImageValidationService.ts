import { Type } from "@google/genai";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { ai, GEMINI_MODEL } from "../../lib/gemini";
import { s3 } from "../middlewares/upload";

export const checkBodyImage = async (
    key: string,
    mimeType: string,
    angle: string
): Promise<{ status: "APPROVED" | "REJECTED"; reason: string }> => {
    const obj = await s3.send(
        new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
        })
    );
    const bytes = await obj.Body!.transformToByteArray();
    const data = Buffer.from(bytes).toString("base64");

    const prompt = `
คุณคือผู้ตรวจรูปถ่ายร่างกายสำหรับแอปลองเสื้อผ้าเสมือนจริง ในโหมดเข้มงวดสุดขีด
คำตอบเริ่มต้นคือ REJECT อนุมัติ (APPROVE) เฉพาะเมื่อผ่านเงื่อนไขครบทุกข้อเท่านั้น
ถ้าไม่แน่ใจในเรื่องใดแม้เพียงเล็กน้อย ให้ถือว่าไม่ผ่าน (ค่า false) ทันที ห้ามเดา ห้ามประนีประนอม

ขั้นที่ 1 — สังเกตข้อมูลจริงจากภาพเท่านั้น ห้ามใช้ชื่อมุมที่ส่งมามาเดาคำตอบ ให้ตรวจหัวข้อต่อไปนี้

ตรวจรายละเอียดใบหน้าและร่างกาย:
face_visible:
 เห็นใบหน้าชัดเจน (ตา จมูก ปาก) หรือไม่
back_of_head_visible:
 เห็นท้ายทอยหรือทรงผมด้านหลังศีรษะ (ไม่ใช่ใบหน้า) หรือไม่
both_eyes_visible:
 เห็นตาทั้งสองข้างในภาพพร้อมกันหรือไม่
nose_points_to:
 จากมุมมองของกล้อง (ผู้ชมภาพ) ปลายจมูกชี้ไปทิศไหน:
  "toward_camera"    = จมูกชี้ตรงเข้าหาเลนส์ (ถ่ายหน้า)
  "away_from_camera" = จมูกชี้ออกจากเลนส์ (ถ่ายหลัง)
  "left"             = ปลายจมูกชี้ไปทางขอบซ้ายของภาพ (ถ่ายโปรไฟล์ซ้าย)
  "right"            = ปลายจมูกชี้ไปทางขอบขวาของภาพ (ถ่ายโปรไฟล์ขวา)
both_shoulders_equal:
 ไหล่ทั้งสองข้างเห็นครบและระยะห่างจากกล้องใกล้เคียงกันหรือไม่
head_in_frame:
 ยอดศีรษะเห็นครบในภาพ ไม่โดนขอบบนตัดหรือไม่
feet_in_frame:
 ข้อเท้าและปลายเท้าทั้งสองข้างอยู่ในภาพครบ ไม่โดนขอบล่างตัดหรือไม่

ตรวจเนื้อหาและท่าทาง:
is_real_person:
 ต้องเป็นคนจริงเพียง 1 คนเท่านั้น
  REJECT ถ้า: ตุ๊กตา หุ่นแสดง รูปวาด รูปปั้น สัตว์ วัตถุ หรือไม่มีคนในภาพ
  REJECT ถ้า: มีคนมากกว่า 1 คน หรือตัวคนถูกเจือจางจนแยกไม่ออก
is_standing_straight:
 ยืนตัวตรงโดยเท้าทั้งสองข้างแตะพื้น หรือไม่
  REJECT ถ้า: ท่านั่ง ย่อตัว นอน พิงแรง เอนตัวมาก กระโดด ก้าวเท้าลอย หรือทิ้งน้ำหนักเอียงข้างเดียวหนักผิดปกติ
no_pose:
 เป็นท่าธรรมชาติแขนแนบลำตัว หรือไม่:
  REJECT ถ้า: แขนยกสูงกว่าระดับเอว มือจับเอว แขนขวางขึ้น โพสแฟชั่น เต้น หรือเท้าหนึ่งยกลอย
  ALLOW ถ้า: แขนพักลงแนบลำตัวตามธรรมชาติ หรือเอียงแขนเล็กน้อยเท่านั้น

ตรวจคุณภาพภาพ (clear_enough) ให้ตรวจแยกรายข้อ — ข้อใดข้อใดใน 4 ข้อนี้ไม่ผ่าน ให้ค่า false:
 เงื่อนไขเสมอ: ห้ามเดาว่า "น่าจะชัด" หรือ "คงอ่านออก" ให้ตัดสินจากสิ่งที่เห็นในภาพเท่านั้น
 1) ความสว่างต้องพอ:
   ภาพมืดถึงขั้นที่รายละเอียดสำคัญ (ใบหน้า แขน เท้า ลายเสื้อผ้า) จมอยู่ในเงามืด
   หรือแยกคนจากพื้นหลังยาก หรือต้องเดาว่าตัวคนอยู่ตรงไหน → false
 2) ความสว่างต้องไม่จ้าเกิน:
   มีพื้นที่ขาวจ้า/แสงแรงจนเกิด overexposed หรือรายละเอียดผิว/ผ้าซีดลอย (washed out)
   หรือมีแสงด้านหลังตัวคน (backlit) จนตัวคนกลายเป็นเงาดำ → false
 3) ความคมชัด:
   ภาพเบลอ สั่นมือ (motion blur) โฟกัสไม่ตรงตัวคน หรือความละเอียดต่ำ
   จนไม่เห็นรายละเอียดใบหน้า/รอยเสื้อผ้าชัด → false
 4) ความเปรียบเทียบสี (contrast):
   ภาพซีดหม่น ตัวคนกลืนกับพื้นหลัง หรือมี noise/grain เยอะ
   จนอ่านรายละเอียดตัวคนได้ยาก → false

ขั้นที่ 2 — ตัดสินมุมภาพที่ถ่ายจริง โดยเทียบกับมุมที่ร้องขอ "${angle.toUpperCase()}":

หมายเหตุ ซ้าย/ขวา:
 LEFT profile  = คนหันซ้าย = ปลายจมูกชี้ไปทางซ้ายของภาพ
 RIGHT profile = คนหันขวา  = ปลายจมูกชี้ไปทางขวาของภาพ

front → face_visible=true  AND both_eyes_visible=true  AND nose_points_to="toward_camera"  AND both_shoulders_equal=true
back  → face_visible=false AND back_of_head_visible=true AND nose_points_to="away_from_camera"
left  → face_visible=true  AND both_eyes_visible=false AND nose_points_to="left"
right → face_visible=true  AND both_eyes_visible=false AND nose_points_to="right"

full_body_visible → head_in_frame=true AND feet_in_frame=true

ขั้นที่ 3 — เขียน reason เป็นภาษาไทยให้ชัดเจน:
ระบุทุกข้อที่ไม่ผ่าน พร้อมคำอธิบายโดยละเอียด เช่น
  "ภาพมืดเกินไป แยกตัวคนจากพื้นหลังได้ยาก"
  "ถ่ายมุมหน้าแต่ผู้ใช้ขอมุมหลัง"
ถ้าผ่านทุกข้อ ให้ยืนยันสั้นๆ ว่าผ่านทุกเงื่อนไข
`;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
            { inlineData: { mimeType, data } },
            { text: prompt },
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    face_visible:         { type: Type.BOOLEAN },
                    back_of_head_visible: { type: Type.BOOLEAN },
                    both_eyes_visible:    { type: Type.BOOLEAN },
                    nose_points_to:       { type: Type.STRING  },
                    both_shoulders_equal: { type: Type.BOOLEAN },
                    head_in_frame:        { type: Type.BOOLEAN },
                    feet_in_frame:        { type: Type.BOOLEAN },
                    is_real_person:       { type: Type.BOOLEAN },
                    is_standing_straight: { type: Type.BOOLEAN },
                    no_pose:              { type: Type.BOOLEAN },
                    clear_enough:         { type: Type.BOOLEAN },
                    angle_correct:        { type: Type.BOOLEAN },
                    full_body_visible:    { type: Type.BOOLEAN },
                    reason:               { type: Type.STRING  },
                },
                required: [
                    "face_visible",
                    "back_of_head_visible",
                    "both_eyes_visible",
                    "nose_points_to",
                    "both_shoulders_equal",
                    "head_in_frame",
                    "feet_in_frame",
                    "is_real_person",
                    "is_standing_straight",
                    "no_pose",
                    "clear_enough",
                    "angle_correct",
                    "full_body_visible",
                    "reason",
                ],
            },
        },
    });

    const r = JSON.parse(response.text ?? "{}");

    const angleRules: Record<string, boolean> = {
        front:
            r.face_visible         === true &&
            r.both_eyes_visible    === true &&
            r.nose_points_to       === "toward_camera" &&
            r.both_shoulders_equal === true,
        back:
            r.face_visible         === false &&
            r.back_of_head_visible === true  &&
            r.nose_points_to       === "away_from_camera",
        left:
            r.face_visible      === true  &&
            r.both_eyes_visible === false &&
            r.nose_points_to    === "left",
        right:
            r.face_visible      === true  &&
            r.both_eyes_visible === false &&
            r.nose_points_to    === "right",
    };

    const angleCorrect    = angleRules[angle] ?? false;
    const fullBodyVisible = r.head_in_frame === true && r.feet_in_frame === true;

    const passed =
        r.is_real_person       === true &&
        r.is_standing_straight === true &&
        r.no_pose              === true &&
        r.clear_enough         === true &&
        fullBodyVisible                 &&
        angleCorrect;

    if (!passed) {
        const failReasons: string[] = [];

        if (!r.is_real_person)
            failReasons.push("ไม่พบบุคคลในภาพ กรุณาถ่ายรูปที่มีคุณอยู่ในภาพ");
        if (!r.is_standing_straight)
            failReasons.push("กรุณายืนตัวตรงและมองตรงไปข้างหน้า");
        if (!r.no_pose)
            failReasons.push("กรุณาวางแขนแนบลำตัวตามธรรมชาติ ไม่ต้องโพสท่าพิเศษ");
        if (!r.clear_enough)
            failReasons.push("ภาพมืดเกินไปหรือไม่ค่อยชัด กรุณาถ่ายใหม่ในที่ที่มีแสงสว่างเพียงพอ ภาพไม่เบลอ");
        if (!fullBodyVisible) {
            if (!r.head_in_frame)
                failReasons.push("กรุณาถ่ายให้เห็นศีรษะครบในภาพ");
            if (!r.feet_in_frame)
                failReasons.push("กรุณาถ่ายให้เห็นเท้าครบในภาพ");
        }
        if (!angleCorrect) {
            const expected: Record<string, string> = {
                front: "กรุณาหันหน้าตรงเข้าหากล้อง ให้เห็นใบหน้าและไหล่ทั้งสองข้างชัดเจน",
                back:  "กรุณาหันหลังให้กล้อง โดยไม่หันมามองกล้อง",
                left:  "กรุณาหันด้านซ้ายของร่างกายเข้าหากล้อง",
                right: "กรุณาหันด้านขวาของร่างกายเข้าหากล้อง",
            };
            failReasons.push(expected[angle] ?? `กรุณาถ่ายรูปในมุม ${angle}`);
        }

        return {
            status: "REJECTED",
            reason: failReasons.join(" และ"),
        };
    }

    return {
        status: "APPROVED",
        reason: "ภาพผ่านการตรวจสอบทุกเงื่อนไข",
    };
};