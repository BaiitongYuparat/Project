import express from 'express'
import { adminLoginGoogle, logoutAdmin, getCurrentAdmin, devAdminLogin } from '../controllers/adminAuth'
import { adminAuthMiddleware } from '../middlewares/adminAuth'

// ระบบ login ฝั่งผู้ดูแล (ตาราง Admin) — แยกจาก /auth ของ shopper
const router = express.Router()

router.post('/google', adminLoginGoogle)
router.post('/logout', logoutAdmin)
router.get("/me", adminAuthMiddleware, getCurrentAdmin)
router.post('/dev-login', devAdminLogin)

export default router
