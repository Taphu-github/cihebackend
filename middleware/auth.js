import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma/index.js';
import { AppError } from '../utils/errors.js';


const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Access denied. No token provided.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            program: true,
            yearLevel: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User not found.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid token.', 401));
    }
  }
};

export { authMiddleware };