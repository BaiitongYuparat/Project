import express from 'express'
import { getUsersId, updateUser } from '../controllers/user'

// Routes ฝั่ง shopper (ตาราง User) — mounted ที่ /user พร้อม authMiddleware
const router = express.Router()

router.get('/:id', getUsersId)
router.put('/',updateUser)

export default router
