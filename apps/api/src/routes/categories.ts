import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Fetch categories from database
    const categories = [
      { id: '1', name: 'إلكترونيات', nameEn: 'Electronics', icon: '📱' },
      { id: '2', name: 'أزياء', nameEn: 'Fashion', icon: '👔' },
      { id: '3', name: 'منزل وحديقة', nameEn: 'Home & Garden', icon: '🏠' },
      { id: '4', name: 'سيارات', nameEn: 'Vehicles', icon: '🚗' },
      { id: '5', name: 'عقارات', nameEn: 'Real Estate', icon: '🏢' },
    ];

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
