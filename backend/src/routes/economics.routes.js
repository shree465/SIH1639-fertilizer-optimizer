import { Router } from 'express';
import { postEconomics } from '../controllers/economics.controller.js';

const router = Router();

router.post('/economics', postEconomics);

export default router;
