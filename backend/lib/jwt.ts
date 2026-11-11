import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export interface AuthTokenPayload {
    userId: string;
}

// access token
export const signToken = (userId: string): string => {
    return jwt.sign({ userId } satisfies AuthTokenPayload, JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: JWT_EXPIRES_IN,
    });
};

// ตรวจ token และ return payload
export const verifyToken = (token: string): AuthTokenPayload => {
    const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ["HS256"],
    });

    if (typeof decoded === "string" || typeof decoded.userId !== "string") {
        throw new jwt.JsonWebTokenError("Invalid token payload");
    }

    return { userId: decoded.userId };
};

//---------------------Admin token (แยก audience จาก token ฝั่ง user ออกกันใช้ข้ามระบบ)---------------------

export interface AdminTokenPayload {
    adminId: string;
}

const ADMIN_AUDIENCE = "admin";

export const signAdminToken = (adminId: string): string => {
    return jwt.sign({ adminId } satisfies AdminTokenPayload, JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: JWT_EXPIRES_IN,
        audience: ADMIN_AUDIENCE,
    });
};

export const verifyAdminToken = (token: string): AdminTokenPayload => {
    const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ["HS256"],
        audience: ADMIN_AUDIENCE,
    });

    if (typeof decoded === "string" || typeof decoded.adminId !== "string") {
        throw new jwt.JsonWebTokenError("Invalid admin token payload");
    }

    return { adminId: decoded.adminId };
};