import { Router } from 'express';
import { postRecommend } from '../controllers/recommend.controller.js';

const router = Router();

router.post('/recommend', postRecommend);

export default router;
