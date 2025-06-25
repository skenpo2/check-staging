import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './app.config';
import { NotFoundException } from '../utils/appError';
import { ProviderEnum } from '../enums/account-provider.enum';
import { googleLoginOrCreateAccountService } from '../modules/auth/auth.services';

export const configureGoogleStrategy = async () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL,
        scope: [
          'profile',
          'email',
          'https://www.googleapis.com/auth/calendar.events',
        ],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { email, sub: googleId, picture } = profile._json;
          console.log(profile, 'profile');
          console.log(googleId, 'googleId');
          if (!googleId) {
            throw new NotFoundException('Google ID (sub) is missing');
          }

          const user = await googleLoginOrCreateAccountService({
            provider: ProviderEnum.GOOGLE,
            displayName: profile.displayName,
            providerId: googleId,
            picture: picture,
            email: email,
            accessToken,
            refreshToken,
          });
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};
