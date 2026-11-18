import { Router } from "express";
import {
  addFavorite,
  getFavoriteIds,
  getFavorites,
  removeFavorite,
} from "../controllers/favorite";

const router = Router();

// รายการโปรดของ shopper — ใช้ร่วมกันทั้งเว็บและแอป
router.get("/", getFavorites);
router.get("/ids", getFavoriteIds);
router.post("/", addFavorite);
router.delete("/:productId", removeFavorite);

export default router;
