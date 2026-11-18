import express from "express";
import { startTryOn, getTryOn, listTryOns } from "../controllers/tryon";

const router = express.Router();

router.get("/", listTryOns);
router.post("/", startTryOn);
router.get("/:id", getTryOn);

export default router;
