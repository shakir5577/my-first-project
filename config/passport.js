const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('../models/userModel'); 
require('dotenv').config()


passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.CALLBACK_URL,
    passReqToCallback: true
},
async (request, accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.email });

        if (!user) {
            user = new User({
                email: profile.email,
                name: profile.displayName,
                isVerified: true,
                isAdmin: false, 
            });
            await user.save();
        }

        return done(null, user); 
    } catch (error) {
        return done(error, null);
    }
}));