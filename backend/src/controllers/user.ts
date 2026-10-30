import { Request, Response } from "express"
import { prisma } from "../../lib/prisma"


export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany()
        res.json(users)
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' })
    }
}

export const getUsersId = async (req: Request, res: Response) => {
    const id = req.user!.id as string
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: id
            }
        })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }
        res.json(user)
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' })
    }
};


export const deleteUser = async (req: Request, res: Response) => {
    const id = req.user!.id as string
    try {
        const user = await prisma.user.delete({
            where: { id: id }
        });
        res.json({
            message: "User deleted successfully",
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete user" });

    }
}

export const updateUser = async (req:Request , res: Response) => {
     const id = req.user!.id as string
     const { name, email, phone } = req.body;
     try{
        const user = await prisma.user.update({
             where: { id: id },
             data: {
                name,
                email,
                phone     
             }
        })
        return res.json(user);
     }
     catch (error){
        console.error(error);
        res.status(500).json({ error: "Failed to update user" });
     }
}

export const createUser = async (req:Request , res:Response) => {
    const {name , email , phone , } = req.body;
    try{
        const user = await prisma.user.create({
            data: {
                email,
                phone,
                name
            }
        })
        return res.status(201).json(user);
    }catch(error){
        console.error(error);
        res.status(500).json({ error: "Failed to create user" });
    }
}