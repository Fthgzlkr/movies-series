import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import env from 'dotenv';
import flash from 'connect-flash';

import authRoutes from './routers/authRoutes.js';
import homeRoutes from './routers/homeRoutes.js';
import serieRoutes from './routers/serieRoutes.js';
import movieRoutes from './routers/movieRoutes.js';
import { getUserByUsername, getUserById, validatePassword } from './models/userModel.js';

env.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await getUserByUsername(username);

            if (!user) {
                return done(null, false, { message: 'Yanlış kullanıcı adı veya şifre' });
            }

            const isValid = await validatePassword(password, user.password);
            if (isValid) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Yanlış kullanıcı adı veya şifre' });
            }
        } catch (error) {
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await getUserById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Route handling
app.use('/', authRoutes);
app.use('/', homeRoutes);
app.use('/', serieRoutes);
app.use('/', movieRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
