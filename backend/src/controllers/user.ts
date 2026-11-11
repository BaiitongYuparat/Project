import { Request, Response } from "express"
import { prisma } from "../../lib/prisma"

// เรียกผ่าน /admin (adminRoutes) — Super Admin เท่านั้น
// User Management แสดงเฉพาะ shopper — ตัดบัญชีเจ้าของร้าน/แอดมิน (ตาราง Admin) ออก
export const getUsers = async (req: Request, res: Response) => {
    try {
        const adminEmails = (
            await prisma.admin.findMany({ select: { email: true } })
        ).map((a) => a.email);

        const users = await prisma.user.findMany({
            where: { email: { notIn: adminEmails } },
        });
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


// เรียกผ่าน /admin (adminRoutes) — ลบบัญชี shopper
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id as string | undefined;

    if (!targetId) {
      return res.status(400).json({ error: "User id is required" });
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.user.delete({ where: { id: targetId } });

    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error(error);
    
    if (error.code === "P2003" || error.code === "P2010") {
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
        
        if (gender !== undefined && !["MALE", "FEMALE"].includes(gender)) {
            return res.status(400).json({ error: "Invalid gender, must be MALE or FEMALE" });
        }
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
       
        if (gender !== undefined && !["MALE", "FEMALE"].includes(gender)) {
            return res.status(400).json({ error: "Invalid gender, must be MALE or FEMALE" });
        }
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

// เรียกผ่าน /admin (adminRoutes) — ระงับ/ปลดระงับบัญชี shopper
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const  id  = req.params.id as string;
    const { status } = req.body as { status?: string };

    if (status !== "active" && status !== "suspended") {
      return res.status(400).json({ error: "Invalid status" });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: "User not found" });

    const user = await prisma.user.update({ where: { id }, data: { status } });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user status" });
  }
};