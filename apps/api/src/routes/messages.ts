import { Router, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Validation rules
const validateSendMessage = [
  body('receiver_id').isUUID().withMessage('Invalid receiver ID'),
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be 1-5000 characters'),
  body('product_id').optional().isUUID().withMessage('Invalid product ID'),
];

/**
 * @route   GET /api/messages
 * @desc    Get user messages (inbox/outbox)
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError('User not authenticated', 401);
    }

    // Fetch messages where user is sender or receiver
    const result = await query(
      `SELECT m.id, m.sender_id, m.receiver_id, m.product_id, m.content, m.read, m.created_at,
              sender.name as sender_name, sender.email as sender_email,
              receiver.name as receiver_name, receiver.email as receiver_email,
              p.title as product_title
       FROM messages m
       LEFT JOIN users sender ON m.sender_id = sender.id
       LEFT JOIN users receiver ON m.receiver_id = receiver.id
       LEFT JOIN products p ON m.product_id = p.id
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { 
        messages: result.rows.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          senderEmail: msg.sender_email,
          receiverId: msg.receiver_id,
          receiverName: msg.receiver_name,
          receiverEmail: msg.receiver_email,
          productId: msg.product_id,
          productTitle: msg.product_title,
          content: msg.content,
          read: msg.read,
          createdAt: msg.created_at,
        }))
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/messages/conversations
 * @desc    Get list of conversations (unique users the current user has chatted with)
 * @access  Private
 */
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError('User not authenticated', 401);
    }

    // Get unique conversations with last message
    const result = await query(
      `SELECT DISTINCT ON (other_user_id)
              other_user_id, other_user_name, other_user_email,
              last_message, last_message_time, unread_count
       FROM (
         SELECT 
           CASE 
             WHEN m.sender_id = $1 THEN m.receiver_id 
             ELSE m.sender_id 
           END as other_user_id,
           CASE 
             WHEN m.sender_id = $1 THEN receiver.name 
             ELSE sender.name 
           END as other_user_name,
           CASE 
             WHEN m.sender_id = $1 THEN receiver.email 
             ELSE sender.email 
           END as other_user_email,
           m.content as last_message,
           m.created_at as last_message_time,
           (SELECT COUNT(*) FROM messages 
            WHERE receiver_id = $1 
              AND sender_id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
              AND read = false) as unread_count
         FROM messages m
         LEFT JOIN users sender ON m.sender_id = sender.id
         LEFT JOIN users receiver ON m.receiver_id = receiver.id
         WHERE m.sender_id = $1 OR m.receiver_id = $1
         ORDER BY m.created_at DESC
       ) conversations
       ORDER BY other_user_id, last_message_time DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { 
        conversations: result.rows.map(conv => ({
          userId: conv.other_user_id,
          userName: conv.other_user_name,
          userEmail: conv.other_user_email,
          lastMessage: conv.last_message,
          lastMessageTime: conv.last_message_time,
          unreadCount: parseInt(conv.unread_count) || 0,
        }))
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/messages
 * @desc    Send a new message
 * @access  Private
 */
router.post('/', authenticate, validateSendMessage, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`, 400);
    }

    if (!req.user?.id) {
      throw new AppError('User not authenticated', 401);
    }

    const { receiver_id, content, product_id } = req.body;

    // Check if receiver exists
    const receiverCheck = await query('SELECT id FROM users WHERE id = $1', [receiver_id]);
    if (receiverCheck.rows.length === 0) {
      throw new AppError('Receiver not found', 404);
    }

    // Prevent sending to self
    if (receiver_id === req.user.id) {
      throw new AppError('Cannot send message to yourself', 400);
    }

    // Insert message
    const result = await query(
      `INSERT INTO messages (sender_id, receiver_id, product_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_id, receiver_id, product_id, content, read, created_at`,
      [req.user.id, receiver_id, product_id || null, content]
    );

    const message = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: {
          id: message.id,
          senderId: message.sender_id,
          receiverId: message.receiver_id,
          productId: message.product_id,
          content: message.content,
          read: message.read,
          createdAt: message.created_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/messages/:id/read
 * @desc    Mark a message as read
 * @access  Private
 */
router.patch('/:id/read', authenticate, [
  param('id').isUUID().withMessage('Invalid message ID')
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    if (!req.user?.id) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;

    // Update only if current user is the receiver
    const result = await query(
      `UPDATE messages 
       SET read = true 
       WHERE id = $1 AND receiver_id = $2
       RETURNING id, read`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Message not found or you are not the receiver', 404);
    }

    res.json({
      success: true,
      message: 'Message marked as read',
      data: {
        id: result.rows[0].id,
        read: result.rows[0].read,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
