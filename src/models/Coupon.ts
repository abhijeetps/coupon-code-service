export interface Coupon {
  code: string;
  description: string;
  discountPercentage: number;
  expirationDate: Date;
  repeatCounts: RepeatCount[];
}

export interface RepeatCount {
  type: 'GLOBAL_TOTAL' | 'USER_TOTAL' | 'USER_DAILY' | 'USER_WEEKLY';
  limit: number;
  current: number;
}
