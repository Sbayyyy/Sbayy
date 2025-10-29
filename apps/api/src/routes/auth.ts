import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().isLength({ min: 2 }),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  validateRegistration,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { email, password, name } = req.body;

      // TODO: Check if user exists in database
      // TODO: Hash password and save user to database
      const hashedPassword = await bcrypt.hash(password, 12);

      // Mock user creation
      const user = {
        id: '123',
        email,
        name,
        password: hashedPassword,
      };

      const jwtSecret = process.env.JWT_SECRET || 'default_secret';
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';

      const signOptions: SignOptions = { expiresIn: '15m' };
      const refreshSignOptions: SignOptions = { expiresIn: '7d' };

      const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, signOptions);
      const refreshToken = jwt.sign({ id: user.id }, jwtRefreshSecret, refreshSignOptions);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { password } = req.body;

    // TODO: Fetch user from database
    // Mock user
    const user = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      password: await bcrypt.hash('password123', 12),
    };

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const jwtSecret = process.env.JWT_SECRET || 'default_secret';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';

    const signOptions: SignOptions = { expiresIn: '15m' };
    const refreshSignOptions: SignOptions = { expiresIn: '7d' };

    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, signOptions);
    const refreshToken = jwt.sign({ id: user.id }, jwtRefreshSecret, refreshSignOptions);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
