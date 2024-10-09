import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import couponRoutes from './routes/couponRoutes';
import errorHandler from './utils/errorHandler';
import { connectRedis } from './config/redis';

const app = express();
app.use(express.json());

app.use('/api/coupons', couponRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
