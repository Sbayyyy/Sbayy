import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError('User not authenticated', 401);
    }

    // Fetch user from database
    const result = await query(
      'SELECT id, email, name, phone, avatar, rating, verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar,
          rating: user.rating,
          verified: user.verified,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
