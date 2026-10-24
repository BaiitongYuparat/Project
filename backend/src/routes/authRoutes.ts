import express from 'express'
import { logoutUser , logingoogle } from '../controllers/auth'

const router = express.Router()

router.post('/google', logingoogle)
router.post('/logout', logoutUser)

export default router
