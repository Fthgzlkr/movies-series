import express from 'express';
import { login, register, logout } from '../controllers/authController.js';

const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login', { error: req.flash('error') });
});

router.post('/login', login);

router.get('/register', (req, res) => {
    res.render('register'); // register.ejs dosyasını render eder
});
router.post('/register', register);

router.get('/logout', logout);

export default router;
