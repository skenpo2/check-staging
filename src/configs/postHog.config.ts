import { PostHog } from 'posthog-node';
import dotenv from 'dotenv';

dotenv.config();

const client = new PostHog(process.env.POSTHOG_KEY!, {
  host: process.env.POSTHOG_HOST,
});

export default client;
