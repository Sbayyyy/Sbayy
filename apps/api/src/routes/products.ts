import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @route   GET /api/products
 * @desc    Get all products with pagination and filters
 * @access  Public
 */
router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid query parameters', 400);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Fetch products from database
      const products = [
        {
          id: '1',
          title: 'منتج تجريبي',
          description: 'وصف المنتج',
          price: 100,
          currency: 'SYP',
          images: [],
          category: 'electronics',
          seller: { id: '123', name: 'البائع' },
          createdAt: new Date().toISOString(),
        },
      ];

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            page,
            limit,
            total: 1,
            pages: 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  [
    body('title').trim().isLength({ min: 3 }),
    body('description').trim().isLength({ min: 10 }),
    body('price').isFloat({ min: 0 }),
    body('category').notEmpty(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      // TODO: Save product to database
      const product = {
        id: '1',
        ...req.body,
        sellerId: req.user?.id,
        createdAt: new Date().toISOString(),
      };

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
