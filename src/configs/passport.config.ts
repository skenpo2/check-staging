import passport from 'passport';
import { configureJwtStrategy } from './jwt-strategy.config';
import { configureGoogleStrategy } from './google-strategy.config';

// Setup all strategies
configureJwtStrategy();
configureGoogleStrategy();

export default passport;
