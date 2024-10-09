import { CouponService } from '../src/services/couponService';
import { CouponRepository } from '../src/repositories/couponRepository';
import { Coupon, RepeatCount } from '../src/models/Coupon';

import redisClient from '../src/config/redis';

jest.mock('../src/config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    multi: jest.fn().mockReturnThis(),
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  },
}));

jest.mock('../src/repositories/couponRepository');

describe('CouponService', () => {
  let service: CouponService;
  let repository: jest.Mocked<CouponRepository>;

  beforeEach(() => {
    repository = new CouponRepository() as jest.Mocked<CouponRepository>;
    service = new CouponService(repository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCoupon', () => {
    test('should create a new coupon', async () => {
      const couponData: Omit<Coupon, 'repeatCounts'> = {
        code: 'NEW123',
        description: 'New coupon',
        discountPercentage: 10,
        expirationDate: new Date('2024-12-31'),
      };

      repository.findByCode.mockResolvedValueOnce(null);
      repository.save.mockResolvedValueOnce();

      const newCoupon = await service.createCoupon(couponData);

      expect(newCoupon).toEqual({ ...couponData, repeatCounts: [] });
      expect(repository.save).toHaveBeenCalledWith(newCoupon);
    });

    test('should throw an error if coupon already exists', async () => {
      const couponData = {
        code: 'EXISTING123',
        description: 'Existing coupon',
        discountPercentage: 15,
        expirationDate: new Date('2024-12-31'),
      };

      repository.findByCode.mockResolvedValueOnce({
        ...couponData,
        repeatCounts: [],
      });

      await expect(service.createCoupon(couponData)).rejects.toThrow(
        'Coupon with this code already exists'
      );
    });
  });

  describe('addRepeatCounts', () => {
    test('should add repeat counts to an existing coupon', async () => {
      const code = 'TEST123';
      const repeatCounts: RepeatCount[] = [
        { type: 'GLOBAL_TOTAL', limit: 1000, current: 0 },
        { type: 'USER_TOTAL', limit: 3, current: 0 },
      ];

      const existingCoupon: Coupon = {
        code,
        description: 'Test coupon',
        discountPercentage: 10,
        expirationDate: new Date('2024-12-31'),
        repeatCounts: [],
      };

      repository.findByCode.mockResolvedValueOnce(existingCoupon);
      repository.save.mockResolvedValueOnce();

      await service.addRepeatCounts(code, repeatCounts);

      expect(repository.save).toHaveBeenCalledWith({
        ...existingCoupon,
        repeatCounts,
      });
    });

    test('should throw an error if coupon not found', async () => {
      const code = 'NONEXISTENT';
      const repeatCounts: RepeatCount[] = [
        { type: 'GLOBAL_TOTAL', limit: 1000, current: 0 },
      ];

      repository.findByCode.mockResolvedValueOnce(null);

      await expect(service.addRepeatCounts(code, repeatCounts)).rejects.toThrow(
        'Coupon not found'
      );
    });
  });

  describe('verifyCoupon', () => {
    test('should return true for a valid coupon', async () => {
      const code = 'VALID123';
      const userId = 'user1';
      const coupon: Coupon = {
        code,
        description: 'Valid coupon',
        discountPercentage: 20,
        expirationDate: new Date('2024-12-31'),
        repeatCounts: [
          { type: 'GLOBAL_TOTAL', limit: 1000, current: 500 },
          { type: 'USER_TOTAL', limit: 3, current: 1 },
        ],
      };

      repository.findByCode.mockResolvedValueOnce(coupon);
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const isValid = await service.verifyCoupon(code, userId);

      expect(isValid).toBe(true);
    });

    test('should return false for an invalid coupon', async () => {
      const code = 'INVALID123';
      const userId = 'user1';
      const coupon: Coupon = {
        code,
        description: 'Invalid coupon',
        discountPercentage: 20,
        expirationDate: new Date('2024-12-31'),
        repeatCounts: [
          { type: 'GLOBAL_TOTAL', limit: 1000, current: 1000 },
          { type: 'USER_TOTAL', limit: 3, current: 3 },
        ],
      };

      repository.findByCode.mockResolvedValueOnce(coupon);

      const isValid = await service.verifyCoupon(code, userId);

      expect(isValid).toBe(false);
    });
  });

  describe('applyCoupon', () => {
    test('should apply a valid coupon', async () => {
      const code = 'APPLY123';
      const userId = 'user1';
      const coupon: Coupon = {
        code,
        description: 'Apply coupon',
        discountPercentage: 15,
        expirationDate: new Date('2024-12-31'),
        repeatCounts: [
          { type: 'GLOBAL_TOTAL', limit: 1000, current: 500 },
          { type: 'USER_TOTAL', limit: 3, current: 1 },
          { type: 'USER_DAILY', limit: 1, current: 0 },
        ],
      };

      repository.findByCode.mockResolvedValue(coupon);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      const multiMock = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([1, 'OK']),
      };
      (redisClient.multi as jest.Mock).mockReturnValue(multiMock);

      await service.applyCoupon(code, userId);

      expect(repository.save).toHaveBeenCalledWith({
        ...coupon,
        repeatCounts: [
          { type: 'GLOBAL_TOTAL', limit: 1000, current: 501 },
          { type: 'USER_TOTAL', limit: 3, current: 2 },
          { type: 'USER_DAILY', limit: 1, current: 1 },
        ],
      });
    });

    test('should throw an error for an invalid coupon', async () => {
      const code = 'INVALID123';
      const userId = 'user1';

      repository.findByCode.mockResolvedValue(null);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');

      await expect(service.applyCoupon(code, userId)).rejects.toThrow(
        'Invalid coupon'
      );
    });
  });

  describe('getCoupon', () => {
    test('should return a coupon if it exists', async () => {
      const couponData = {
        code: 'TEST123',
        description: 'Test coupon',
        discountPercentage: 10,
        expirationDate: new Date('2024-12-31'),
        repeatCounts: [],
      };

      repository.findByCode.mockResolvedValueOnce(couponData);

      const coupon = await service.getCoupon('TEST123');

      expect(coupon).toEqual(couponData);
      expect(repository.findByCode).toHaveBeenCalledWith('TEST123');
    });

    test('should return null if coupon does not exist', async () => {
      repository.findByCode.mockResolvedValueOnce(null);

      const coupon = await service.getCoupon('NONEXISTENT');

      expect(coupon).toBeNull();
      expect(repository.findByCode).toHaveBeenCalledWith('NONEXISTENT');
    });
  });

  describe('deleteCoupon', () => {
    test('should delete a coupon if it exists', async () => {
      const mockCoupon: Coupon = {
        code: 'TEST123',
        description: 'Test coupon',
        discountPercentage: 10,
        expirationDate: new Date('2024-12-31'),
        repeatCounts: [],
      };
      repository.findByCode.mockResolvedValueOnce(mockCoupon);
      repository.delete.mockResolvedValueOnce();

      const result = await service.deleteCoupon('TEST123');

      expect(result).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith('TEST123');
    });

    test('should return false if coupon does not exist', async () => {
      repository.findByCode.mockResolvedValueOnce(null);

      const result = await service.deleteCoupon('NONEXISTENT');

      expect(result).toBe(false);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
