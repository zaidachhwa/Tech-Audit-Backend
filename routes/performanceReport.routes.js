import express from 'express';
import {
  generatePerformanceReport,
  generateAISummary,
  getHistory,
  downloadPdf
} from '../controllers/performanceReport.controller.js';
import { verifyToken, isAdminOrTeacher } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/generate', verifyToken, isAdminOrTeacher, generatePerformanceReport);
router.post('/generate-ai-summary', verifyToken, isAdminOrTeacher, generateAISummary);
router.get('/history/:studentId', verifyToken, isAdminOrTeacher, getHistory);
router.get('/pdf/:id', downloadPdf);

export default router;
