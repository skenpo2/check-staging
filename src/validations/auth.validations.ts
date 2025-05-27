import z from 'zod';

// Registration Schema (excludes some fields that shouldn't be provided during registration)
export const RegisterUserSchema = z.object({
  name: z
    .string({
      required_error: 'Name is required',
      invalid_type_error: 'Name must be a string',
    })
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name must not exceed 50 characters'),

  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email('Please provide a valid email address'),

  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(8, 'Password must be at least 8 characters long'), // corrected from 6 to 8
  //   .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  //   .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  //   .regex(/[0-9]/, 'Password must contain at least one number')
  //   .regex(
  //     /[^A-Za-z0-9]/,
  //     'Password must contain at least one special character'
  //   )

  phone: z
    .string({
      required_error: 'Phone number is required',
      invalid_type_error: 'Phone number must be a string',
    })
    .regex(/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number'), // corrected regex
});

export const VerifyRegisterUserSchema = z.object({
  name: z
    .string({
      required_error: 'Name is required',
      invalid_type_error: 'Name must be a string',
    })
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name must not exceed 50 characters'),

  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email('Please provide a valid email address'),

  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(8, 'Password must be at least 8 characters long'), // corrected from 6 to 8
  //   .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  //   .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  //   .regex(/[0-9]/, 'Password must contain at least one number')
  //   .regex(
  //     /[^A-Za-z0-9]/,
  //     'Password must contain at least one special character'
  //   )

  otp: z.string().min(6).max(6),

  phone: z
    .string({
      required_error: 'Phone number is required',
      invalid_type_error: 'Phone number must be a string',
    })
    .regex(/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number'), // corrected regex
});

// Login Schema
export const LoginUserSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email('Please provide a valid email address'),
  password: z.string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string',
  }),
});

export type IRegisterUser = z.infer<typeof RegisterUserSchema>;
export type ILoginUser = z.infer<typeof LoginUserSchema>;
