import passport from 'passport';
// import { configureGoogleStrategy } from './google-strategy.config';
import { configureJwtStrategy } from './jwt-strategy.config';

// Setup all strategies
configureJwtStrategy();
// configureGoogleStrategy();

export default passport;
