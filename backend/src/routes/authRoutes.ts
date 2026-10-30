import express from 'express'
import { logoutUser , logingoogle , devLogin } from '../controllers/auth'
import { getCurrentUser } from '../controllers/auth'
import { authMiddleware } from '../middlewares/auth'
const router = express.Router()

router.post('/google', logingoogle)
router.post('/logout', logoutUser)
router.get("/me", authMiddleware, getCurrentUser);
router.post('/dev-login', devLogin) 

export default router
