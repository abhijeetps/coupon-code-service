import express from 'express';
import { CouponController } from '../controllers/couponController';
import { CouponService } from '../services/couponService';
import { CouponRepository } from '../repositories/couponRepository';

const router = express.Router();
const repository = new CouponRepository();
const service = new CouponService(repository);
const controller = new CouponController(service);

router.post('/create', controller.createCoupon);
router.get('/:code', controller.getCoupon);
router.delete('/:code', controller.deleteCoupon);
router.post('/add-repeat-counts', controller.addRepeatCounts);
router.post('/verify', controller.verifyCoupon);
router.post('/apply', controller.applyCoupon);

export default router;
