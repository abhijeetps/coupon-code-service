import { Request, Response } from 'express';
import { CouponService } from '../services/couponService';
import { asyncHandler } from '../utils/errorHandler';

export class CouponController {
  private service: CouponService;

  constructor(service: CouponService) {
    this.service = service;
  }

  createCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { code, description, discountPercentage, expirationDate } = req.body;
    const newCoupon = await this.service.createCoupon({
      code,
      description,
      discountPercentage,
      expirationDate: new Date(expirationDate)
    });
    res.status(201).json(newCoupon);
  });

  addRepeatCounts = asyncHandler(async (req: Request, res: Response) => {
    const { code, repeatCounts } = req.body;
    await this.service.addRepeatCounts(code, repeatCounts);
    res.status(200).json({ message: 'Repeat counts added successfully' });
  });

  verifyCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { code, userId } = req.body;
    const isValid = await this.service.verifyCoupon(code, userId);
    res.status(200).json({ isValid });
  });

  applyCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { code, userId } = req.body;
    await this.service.applyCoupon(code, userId);
    res.status(200).json({ message: 'Coupon applied successfully' });
  });

  getCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const coupon = await this.service.getCoupon(code);
    if (!coupon) {
      res.status(404).json({ message: 'Coupon not found' });
    } else {
      res.status(200).json(coupon);
    }
  });

  deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const deleted = await this.service.deleteCoupon(code);
    if (deleted) {
      res.status(200).json({ message: 'Coupon deleted successfully' });
    } else {
      res.status(404).json({ message: 'Coupon not found' });
    }
  });
}
