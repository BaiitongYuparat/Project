import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ตัวส่งอีเมลแบบ best-effort — ถ้าไม่ได้ตั้งค่า SMTP จะข้ามการส่ง (ไม่ให้ flow หลักพัง)
// env ที่ต้องมี: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (ไม่บังคับ)
let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[email] SMTP is not configured — skip sending email");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
};

const FROM =
  process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@longdress.app";

// ---------- helpers ----------

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const NOTE_BOX_STYLE =
  "margin:16px 0;padding:14px 16px;background:#f5f5f4;border:1px solid #e7e5e4;border-radius:10px;color:#57534e;font-size:14px";

const LAYOUT = (inner: string) => `
  <div style="font-family:-apple-system,'Segoe UI',sans-serif;line-height:1.7;color:#1c1917;max-width:520px;margin:0 auto">
    ${inner}
    <hr style="border:none;border-top:1px solid #e7e5e4;margin:28px 0 12px" />
    <p style="color:#a8a29e;font-size:12px;margin:0">ทีมงาน LongDress</p>
  </div>
`;

// ---------- 1) แจ้งผลคำร้อง: อนุมัติ (ปลดระงับบัญชี) ----------

export const sendAppealDecisionEmail = async (options: {
  to: string;
  name?: string | null;
  decision: "APPROVED" | "REJECTED";
  adminNote?: string | null;
}): Promise<void> => {
  const client = getTransporter();
  if (!client) return;

  const approved = options.decision === "APPROVED";
  const subject = approved
    ? "บัญชีของคุณกลับมาใช้งานได้แล้ว — LongDress"
    : "อัปเดตคำร้องของคุณ — LongDress";

  const greeting = `สวัสดี${options.name ? ` คุณ${escapeHtml(options.name)}` : ""},`;

  const noteHtml = options.adminNote
    ? `<p style="margin:8px 0 0;font-weight:600;font-size:13px;color:#78716c">ข้อความจากทีมงาน</p>
       <div style="${NOTE_BOX_STYLE}">${escapeHtml(options.adminNote).replace(/\n/g, "<br/>")}</div>`
    : "";

  const inner = approved
    ? `
    <p>${greeting}</p>
    <p>ขอบคุณที่ให้ข้อมูลกับทางทีมงาน</p>
    <p>ทีมงาน LongDress ได้ตรวจสอบคำร้องของคุณเรียบร้อยแล้ว และยินดีคืนสิทธิ์การใช้งานให้คุณ — บัญชีของคุณสามารถ<b>เข้าสู่ระบบและใช้งานได้ตามปกติตั้งแต่ตอนนี้เป็นต้นไป</b></p>
    ${noteHtml}
    <p style="margin-top:24px">ขอบคุณที่ใช้ LongDress และหวังว่าจะได้เห็นคุณกลับมาเลือกชุดใหม่สักทู้เร็ว ๆ นี้</p>
  `
    : `
    <p>${greeting}</p>
    <p>ขอบคุณสำหรับคำร้องและข้อมูลที่ส่งมาให้พิจารณา</p>
    <p>ทีมงานได้ตรวจสอบคำร้องของคุณอย่างรอบคอบแล้ว อย่างไรก็ตาม <b>ยังไม่สามารถคืนสิทธิ์การใช้งานบัญชีของคุณได้ในขณะนี้</b> ขออภัยในความไม่สะดวก</p>
    ${noteHtml}
    <p style="margin-top:24px">หากมีข้อมูลเพิ่มเติมที่ต้องการให้ทีมงานพิจารณา คุณสามารถส่งคำร้องใหม่ได้ผ่านหน้าเข้าสู่ระบบของเว็บไซต์</p>
  `;

  try {
    await client.sendMail({
      from: FROM,
      to: options.to,
      subject,
      html: LAYOUT(inner),
    });
  } catch (error) {
    // ส่งเมลไม่สำเร็จไม่กระทบการตัดสินคำร้อง
    console.error("[email] Failed to send appeal decision email:", error);
  }
};

// ---------- 2) ตอบรับร้านค้าที่ได้รับอนุมัติ ----------

// loginUrl ใช้จาก env ADMIN_APP_URL (dev: http://localhost:5174, production: โดเมนจริง)
export const sendBrandApprovedEmail = async (options: {
  to: string;
  brandName: string;
  ownerName?: string | null;
  loginUrl: string;
}): Promise<void> => {
  const client = getTransporter();
  if (!client) return;

  const subject = `ยินดีต้อนรับสู่ LongDress — ร้าน "${escapeHtml(options.brandName)}" พร้อมใช้งานแล้ว`;

  const greeting = `สวัสดี${options.ownerName ? ` คุณ${escapeHtml(options.ownerName)}` : ""},`;

  const inner = `
    <p>${greeting}</p>
    <p style="font-size:20px;margin:4px 0">ยินดีต้อนรับเข้าสู่ LongDress! 🎉</p>
    <p>ร้านค้า <b>${escapeHtml(options.brandName)}</b> ของคุณได้รับการตรวจสอบและอนุมัติเรียบร้อยแล้ว ตอนนี้คุณสามารถเริ่มจัดการสินค้า ไซซ์ชาร์ต และติดตามยอดของร้านผ่านแดชบอร์ดผู้ดูแลได้ทันที</p>
    <p style="margin:24px 0">
      <a href="${options.loginUrl}" style="display:inline-block;background:#1c1917;color:#ffffff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:600">
        เริ่มจัดการร้านของคุณ
      </a>
    </p>
    <p style="color:#57534e;font-size:14px">
      เข้าสู่ระบบด้วย Google โดยใช้อีเมลฉบับนี้ (<b>${escapeHtml(options.to)}</b>) — ระบบจะจับคู่บัญชีผู้ดูแลร้านให้โดยอัตโนมัติ
    </p>
  `;

  try {
    await client.sendMail({
      from: FROM,
      to: options.to,
      subject,
      html: LAYOUT(inner),
    });
  } catch (error) {
    // ส่งเมลไม่สำเร็จไม่กระทบการอนุมัติร้าน
    console.error("[email] Failed to send brand approval email:", error);
  }
};
