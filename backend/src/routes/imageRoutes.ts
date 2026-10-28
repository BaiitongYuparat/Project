import { Router } from 'express';
import { upload } from '../middlewares/upload';
import { uploadBodyImage } from '../controllers/uploadBody';

const router = Router();

// Endpoint สำหรับอัปโหลดรูปภาพร่างกายทีละ 1 มุม (front, left, right, back)
router.post('/body', upload.single('image'), uploadBodyImage);

export default router;