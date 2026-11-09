import "dotenv/config";
import express from "express";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import bodyRoutes from "./routes/bodyRoutes";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/auth";

import imageRoutes from './routes/imageRoutes';
import clothingRoutes from './routes/clothingRoutes';

import userconsentRoutes from "./routes/userconsentRoutes"
import brandRoutes from "./routes/brandRoutes";
import publicRoutes from "./routes/publicRoutes";
import adminRoutes from "./routes/adminRoutes";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));


app.use("/user", authMiddleware, userRoutes);
app.use("/auth", authRoutes);
app.use("/body", authMiddleware, bodyRoutes);
app.use('/images', authMiddleware, imageRoutes);
app.use('/clothings', authMiddleware, clothingRoutes);
app.use("/userconsent", authMiddleware, userconsentRoutes);


app.use("/", publicRoutes);
app.use("/brands", brandRoutes);
app.use("/admin", adminRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));