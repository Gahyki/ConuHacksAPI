const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const db = require('./db');

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, pass, done) => {
    try {
        
        // Find user
        let user = await db('users').select().where('email', email).first();

        // No such user, send error
        if(!user)
            return done(new Error('User not found'));
        
        // Passwords match, authenticate
        if(bcrypt.compareSync(pass, user.password))
            return done(null, user);
        
        // Passwords did not match, send error
        return done(new Error('Wrong password'));

    } catch (err) {

        // Error fetching user, send error
        done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        
        // Find user through ID
        let user = await db('users').select().where('id', id).first();

        // Send user
        done(null, user);

    } catch (err) {

        // Error fetching user, send error
        done(err);
    }
});