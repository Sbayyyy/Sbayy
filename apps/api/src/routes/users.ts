import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // TODO: Fetch user from database
    res.json({
      success: true,
      data: {
        user: {
          id: req.user?.id,
          email: req.user?.email,
          name: 'Test User',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
