import express from 'express'
import { getUsers, getUsersId, deleteUser , updateUser  } from '../controllers/user'

const router = express.Router()

router.get('/', getUsers)
router.get('/:id', getUsersId)
router.delete('/:id', deleteUser)
router.put('/',updateUser)

export default router