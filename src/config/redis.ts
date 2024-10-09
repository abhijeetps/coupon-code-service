import dotenv from 'dotenv';
dotenv.config();

import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Log errors from the Redis client
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Function to connect to Redis with detailed logging
export const connectRedis = async () => {
  try {
    console.log('Connecting to Redis...');
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Error connecting to Redis:', err);
  }
};

// Function to check if the Redis client is open
export const checkRedisConnection = async () => {
  try {
    const isOpen = redisClient.isOpen;
    console.log('Redis client open:', isOpen);
    return isOpen;
  } catch (err) {
    console.error('Error checking Redis connection:', err);
    return false;
  }
};

export default redisClient;
