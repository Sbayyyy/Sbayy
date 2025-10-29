import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/messages
 * @desc    Get user messages
 * @access  Private
 */
router.get('/', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // TODO: Fetch messages from database
    const messages: unknown[] = [];

    res.json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
