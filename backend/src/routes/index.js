import { Router } from 'express';
import healthRoutes from './health.routes.js';
import recommendRoutes from './recommend.routes.js';
import imbalanceRoutes from './imbalance.routes.js';
import economicsRoutes from './economics.routes.js';
import soilLookupRoutes from './soilLookup.routes.js';
import weatherRoutes from './weather.routes.js';
import schemesRoutes from './schemes.routes.js';
import feedbackRoutes from './feedback.routes.js';
import lccRoutes from './lcc.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(recommendRoutes);
router.use(imbalanceRoutes);
router.use(economicsRoutes);
router.use(soilLookupRoutes);
router.use(weatherRoutes);
router.use(schemesRoutes);
router.use(feedbackRoutes);
router.use(lccRoutes);

export default router;
