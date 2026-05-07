const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  'https://mentalist.codes/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    const user = {
      username: profile.displayName,
      email:    profile.emails[0].value,
      photo:    profile.photos[0].value,
      provider: 'google'
    };
    return done(null, user);
  }
));

module.exports = passport;