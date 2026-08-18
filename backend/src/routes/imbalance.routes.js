import { Router } from 'express';
import { postImbalance } from '../controllers/imbalance.controller.js';

const router = Router();

router.post('/imbalance', postImbalance);

export default router;
