import express from 'express'
import { getBodyData, getBodyDataById, createBody, updateBody , deleteBody} from '../controllers/body'
import { authMiddleware } from '../middlewares/auth'
const router = express.Router()




router.get('/', authMiddleware,getBodyData)
router.get('/latest',authMiddleware, getBodyDataById)
router.post('/', authMiddleware, createBody)
router.put('/',authMiddleware, updateBody)
router.delete('/', authMiddleware,deleteBody)

export default router