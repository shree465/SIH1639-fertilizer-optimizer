import { Router } from 'express';
import { postSchemesMatch } from '../controllers/schemes.controller.js';

const router = Router();

router.post('/schemes/match', postSchemesMatch);

export default router;
