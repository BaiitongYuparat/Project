import { Request, Response } from "express"
import { prisma } from "../../lib/prisma"
import { UserRole } from "@prisma/client";

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
  try {
    const targetId = (req.params.id as string | undefined) ?? req.user!.id;
    const isSelf = targetId === req.user!.id;

    // ลบคนอื่นได้เฉพาะ SUPER_ADMIN
    if (!isSelf && req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Access denied" });
    }

    // กันลบ Super Admin คนอื่น
    if (!isSelf) {
      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        return res.status(404).json({ error: "User not found" });
      }
      if (target.role === UserRole.SUPER_ADMIN) {
        return res.status(403).json({ error: "Cannot delete a Super Admin" });
      }
    }

    await prisma.user.delete({ where: { id: targetId } });

    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2003") {
      return res.status(409).json({
        error: "Cannot delete user with related data",
      });
    }
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
    const id = req.user!.id as string
    const { name, email, gender } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: id },
            data: {
                name,
                email,
                gender,
            }
        })
        return res.json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update user" });
    }
}

export const createUser = async (req: Request, res: Response) => {
    const { name, email, gender, } = req.body;
    try {
        const user = await prisma.user.create({
            data: {
                email,
                gender,
                name,
            }
        })
        return res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create user" });
    }
}

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const  id  = req.params.id as string;
    const { status } = req.body as { status?: string };

    if (status !== "active" && status !== "suspended") {
      return res.status(400).json({ error: "Invalid status" });
    }
    if (id === req.user!.id) {
      return res.status(400).json({ error: "Cannot change your own status" });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Cannot suspend a Super Admin" });
    }

    const user = await prisma.user.update({ where: { id }, data: { status } });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user status" });
  }
};