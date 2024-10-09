import { Coupon, RepeatCount } from '../models/Coupon';
import { CouponRepository } from '../repositories/couponRepository';
import redisClient from '../config/redis';

export class CouponService {
  private repository: CouponRepository;

  constructor(repository: CouponRepository) {
    this.repository = repository;
  }

  async createCoupon(
    couponData: Omit<Coupon, 'repeatCounts'>
  ): Promise<Coupon> {
    const existingCoupon = await this.repository.findByCode(couponData.code);
    if (existingCoupon) {
      throw new Error('Coupon with this code already exists');
    }

    const newCoupon: Coupon = {
      ...couponData,
      repeatCounts: [],
    };

    await this.repository.save(newCoupon);
    return newCoupon;
  }

  async addRepeatCounts(
    code: string,
    repeatCounts: RepeatCount[]
  ): Promise<void> {
    const coupon = await this.repository.findByCode(code);
    if (!coupon) {
      throw new Error('Coupon not found');
    }
    coupon.repeatCounts = repeatCounts;
    await this.repository.save(coupon);
  }

  async verifyCoupon(code: string, userId?: string): Promise<boolean> {
    const coupon = await this.repository.findByCode(code);
    if (!coupon) {
      return false;
    }

    for (const repeatCount of coupon.repeatCounts) {
      if (repeatCount.current >= repeatCount.limit) {
        return false;
      }
      // Additional checks for user-specific and time-based repeat counts
      if (
        userId &&
        (repeatCount.type === 'USER_DAILY' ||
          repeatCount.type === 'USER_WEEKLY')
      ) {
        const key = `${code}:${userId}:${repeatCount.type}`;
        const currentCount = await redisClient.get(key);
        if (currentCount && parseInt(currentCount) >= repeatCount.limit) {
          return false;
        }
      }
    }

    return true;
  }

  async applyCoupon(code: string, userId: string): Promise<void> {
    const lockKey = `lock:${code}:${userId}`;
    const acquireLock = async () => {
      return await redisClient.set(lockKey, '1', {
        NX: true,
        PX: 5000,
      });
    };

    const releaseLock = async () => {
      await redisClient.del(lockKey);
    };

    try {
      const locked = await acquireLock();
      if (!locked) {
        throw new Error('Failed to acquire lock. Try again later.');
      }

      const isValid = await this.verifyCoupon(code, userId);
      if (!isValid) {
        throw new Error('Invalid coupon');
      }

      const coupon = await this.repository.findByCode(code);
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      const now = new Date();
      for (const repeatCount of coupon.repeatCounts) {
        if (repeatCount.current >= repeatCount.limit) {
          throw new Error(`Coupon limit reached for ${repeatCount.type}`);
        }

        repeatCount.current++;

        if (userId) {
          if (repeatCount.type === 'USER_DAILY') {
            const key = `${code}:${userId}:USER_DAILY`;
            await this.incrementAndExpire(key, 24 * 60 * 60);
          } else if (repeatCount.type === 'USER_WEEKLY') {
            const key = `${code}:${userId}:USER_WEEKLY`;
            const daysUntilNextWeek = 7 - now.getDay();
            await this.incrementAndExpire(
              key,
              daysUntilNextWeek * 24 * 60 * 60
            );
          }
        }
      }

      await this.repository.save(coupon);
    } finally {
      await releaseLock();
    }
  }

  private async incrementAndExpire(
    key: string,
    expirationInSeconds: number
  ): Promise<void> {
    await redisClient.multi().incr(key).expire(key, expirationInSeconds).exec();
  }

  async getCoupon(code: string): Promise<Coupon | null> {
    const coupon = await this.repository.findByCode(code);
    if (!coupon) {
      return null;
    }
    return coupon;
  }

  async deleteCoupon(code: string): Promise<boolean> {
    const coupon = await this.repository.findByCode(code);
    if (!coupon) {
      return false;
    }
    await this.repository.delete(code);
    return true;
  }
}
