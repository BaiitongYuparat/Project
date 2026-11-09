import express from "express";
import { getModels } from "../controllers/model";

const router = express.Router();

router.get("/", getModels);

export default router;