import express from 'express'
import { getUsers, getUsersId, deleteUser } from '../controllers/user'

const router = express.Router()

router.get('/', getUsers)
router.get('/:id', getUsersId)
router.delete('/:id', deleteUser)

export default router