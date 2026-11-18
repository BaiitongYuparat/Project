import "dotenv/config";
import express from "express";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import adminAuthRoutes from "./routes/adminAuthRoutes";
import bodyRoutes from "./routes/bodyRoutes";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/auth";

import imageRoutes from "./routes/imageRoutes";
import clothingRoutes from "./routes/clothingRoutes";
import bodyTypeRoutes from './routes/bodyTypeRoutes'; 

import userconsentRoutes from "./routes/userconsentRoutes";
import brandRoutes from "./routes/brandRoutes";
import publicRoutes from "./routes/publicRoutes";
import adminRoutes from "./routes/adminRoutes";
import appealRoutes from "./routes/appealRoutes";

const app = express();
app.use(express.json());
app.use(cookieParser());
// เว็บร้านค้า (5173) + แอปผู้ดูแลแยก (5174) — ตอน production เพิ่ม domain ของแอปผู้ดูแลที่นี่
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
}));

app.use("/user", authMiddleware, userRoutes);
app.use("/auth", authRoutes);
app.use("/admin-auth", adminAuthRoutes);
app.use("/body", authMiddleware, bodyRoutes);
app.use("/images", authMiddleware, imageRoutes);
app.use("/clothings", authMiddleware, clothingRoutes);
app.use("/userconsent", authMiddleware, userconsentRoutes);


app.use("/", publicRoutes);
app.use("/brands", brandRoutes);
app.use("/body-type", authMiddleware, bodyTypeRoutes);
app.use("/admin", adminRoutes);
// คำร้องขอปลดระงับ — auth ด้วย appeal_token แยกจาก session ปกติ (บัญชีที่ถูกระงับ)
app.use("/appeals", appealRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));