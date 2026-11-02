import express from 'express';
import { uploadClothing, handleUploadError } from '../middlewares/upload';
import { createClothing, getClothings } from '../controllers/clothingController';

const router = express.Router();

router.post('/', uploadClothing.single('image'), handleUploadError, createClothing);
router.get('/', getClothings);

export default router;