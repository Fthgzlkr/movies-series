import passport from 'passport';
import { UserModel } from '../models/userModel.js';
import bcrypt from 'bcrypt';

export const login = (req, res, next) => {
    if (!req.session.failedLoginAttempts) {
        req.session.failedLoginAttempts = 0;
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.session.failedLoginAttempts += 1;

            if (req.session.failedLoginAttempts >= 3) {
                return res.redirect('/register');
            }

            req.flash('error', info.message || 'Yanlış kullanıcı adı veya şifre');
            return res.redirect('/login');
        }

        req.session.failedLoginAttempts = 0;
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/home');
        });
    })(req, res, next);
};

export const register = async (req, res) => {
    const { username,email, password } = req.body;

    try {
        const existingUser = await UserModel.getUserByEmail(email);
        if (existingUser) {
            return res.redirect('/login');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await UserModel.createUser(username,email, hashedPassword);
        
        req.login(newUser, (err) => {
            if (err) {
                console.error('Error logging in user:', err);
                return res.status(500).send('Internal Server Error');
            }
            return res.redirect('/home');
        });
    } catch (err) {
        console.error('Error during registration:', err);
        return res.status(500).send('Internal Server Error');
    }
};

export const logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
};
