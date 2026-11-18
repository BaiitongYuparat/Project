import express from "express";
import { startTryOn, getTryOn, listTryOns, downloadTryOn } from "../controllers/tryon";

const router = express.Router();

router.get("/", listTryOns);
router.post("/", startTryOn);
router.get("/:id/download", downloadTryOn);
router.get("/:id", getTryOn);

export default router;
