export const ProviderEnum = {
  GOOGLE: 'GOOGLE',
  GITHUB: 'GITHUB',
  FACEBOOK: 'FACEBOOK',
  EMAIL: 'EMAIL',
};

export type ProviderEnumType = (typeof ProviderEnum)[keyof typeof ProviderEnum];
