import mongoose from 'mongoose';
import { config } from './app.config';
import logger from '../utils/logger';

const connectDb = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Error connecting to MongoDB');
    process.exit(1);
  }
};

export default connectDb;

export { mongoose };
