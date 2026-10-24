import express from 'express'
import { getBodyData, getBodyDataById, createBody, updateBody , deleteBody} from '../controllers/body'

const router = express.Router()

router.get('/', getBodyData)
router.get('/:id', getBodyDataById)
router.post('/', createBody)
router.put('/:id', updateBody)
router.delete('/:id', deleteBody)

export default router