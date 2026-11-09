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
You are a STRICT body-image validator for a virtual try-on fashion app.
Your default answer is REJECT. Only APPROVE when ALL conditions are perfectly met.
When in doubt about ANY field → mark it false/fail.

STEP 1 — Observe these facts literally from the image:

face_visible: Can you see the person's face (eyes/nose/mouth clearly)?
back_of_head_visible: Can you see the back of the head/hair (not face)?
both_eyes_visible: Are BOTH eyes visible at the same time?
nose_points_to: Where does the nose tip point within the image frame?
  IMPORTANT — from the VIEWER/CAMERA perspective looking at the photo:
  "toward_camera"    = nose pointing straight at the lens (front view)
  "away_from_camera" = nose pointing away from lens (back view)
  "left"             = nose tip points toward the LEFT edge of the photo
  "right"            = nose tip points toward the RIGHT edge of the photo
both_shoulders_equal: Are both shoulders visible and roughly equal distance from camera?
head_in_frame: Is the top of the head fully visible (not cut off)?
feet_in_frame: Are both feet/ankles fully visible at the bottom (not cut off)?

is_real_person: Is this a real human body? REJECT if: mannequin, drawing, statue, animal, object, or no person at all.

is_standing_straight: Is the person standing upright with both feet on the ground?
  REJECT if: sitting, crouching, lying down, leaning heavily, jumping, or any non-standing pose.

no_pose: Is the person in a neutral standing position with no special poses?
  REJECT if: arms raised above waist, hands on hips in exaggerated way, leg raised, dancing, or any fashion/model pose.
  ALLOW: arms naturally hanging at sides, slight natural arm position.

clear_enough: Is the image well-lit, in focus, and the person clearly distinguishable from background?

STEP 2 — Determine angle for "${angle.toUpperCase()}":

NOTE on left/right:
  LEFT profile  = person faces LEFT  = nose points to the LEFT  side of the photo
  RIGHT profile = person faces RIGHT = nose points to the RIGHT side of the photo

front → face_visible=true  AND both_eyes_visible=true  AND nose_points_to="toward_camera"  AND both_shoulders_equal=true
back  → face_visible=false AND back_of_head_visible=true AND nose_points_to="away_from_camera"
left  → face_visible=true  AND both_eyes_visible=false AND nose_points_to="left"
right → face_visible=true  AND both_eyes_visible=false AND nose_points_to="right"

full_body_visible → head_in_frame=true AND feet_in_frame=true

STEP 3 — Write reason in English. List every check that failed with a specific description.
If all passed, confirm each check passed.
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
            failReasons.push("ภาพดูไม่ค่อยชัด ลองถ่ายในที่ที่มีแสงสว่างเพียงพอ");
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