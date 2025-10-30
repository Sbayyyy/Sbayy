import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';
import { query } from '../db';

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

      const { email, password, name, phone } = req.body;

      // Check if user already exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        throw new AppError('User with this email already exists', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Insert user into database
      const result = await query(
        `INSERT INTO users (email, password_hash, name, phone) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, email, name, phone, created_at`,
        [email, hashedPassword, name, phone || null]
      );

      const user = result.rows[0];

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
            phone: user.phone,
            createdAt: user.created_at,
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

    const { email, password } = req.body;

    // Fetch user from database
    const result = await query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [
      email,
    ]);

    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
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
