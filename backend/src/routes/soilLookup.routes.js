import { Router } from 'express';
import { getSoilLookup } from '../controllers/soilLookup.controller.js';

const router = Router();

router.get('/soil-lookup/:cardId', getSoilLookup);

export default router;
