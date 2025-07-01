import { z } from 'zod';

export const kycSchema = z.object({
  // Personal Information
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date of birth',
  }),
  address: z.string().min(1, 'Address is required'),

  // Business Information
  businessName: z.string().min(1, 'Business name is required'),
  businessAddress: z.string().min(1, 'Business address is required'),
});
