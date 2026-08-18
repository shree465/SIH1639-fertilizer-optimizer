import { Router } from 'express';
import { postLccReading } from '../controllers/lcc.controller.js';

const router = Router();

router.post('/lcc/reading', postLccReading);

export default router;
