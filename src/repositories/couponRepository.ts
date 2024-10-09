import { Coupon } from '../models/Coupon';
import redisClient from '../config/redis';

export class CouponRepository {
  private readonly keyPrefix = 'coupon:';

  private getKey(code: string): string {
    return `${this.keyPrefix}${code}`;
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const couponString = await redisClient.get(this.getKey(code));
    return couponString ? JSON.parse(couponString) : null;
  }

  async save(coupon: Coupon): Promise<void> {
    await redisClient.set(this.getKey(coupon.code), JSON.stringify(coupon));
  }

  async delete(code: string): Promise<void> {
    await redisClient.del(this.getKey(code));
  }

  async incrementUserCount(
    code: string,
    userId: string,
    type: string,
    expirationInSeconds: number
  ): Promise<void> {
    const key = `${this.keyPrefix}${code}:${userId}:${type}`;
    await redisClient.multi().incr(key).expire(key, expirationInSeconds).exec();
  }

  async getUserCount(
    code: string,
    userId: string,
    type: string
  ): Promise<number> {
    const key = `${this.keyPrefix}${code}:${userId}:${type}`;
    const count = await redisClient.get(key);
    return count ? parseInt(count) : 0;
  }
}
