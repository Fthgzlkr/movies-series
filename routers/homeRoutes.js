import express from 'express';
import { renderHomePage, changePassword } from '../controllers/homeController.js';

const router = express.Router();

// Ana sayfaya /home yönlendirmesi
router.get('/', (req, res) => {
    res.redirect('/login');
});

// Home sayfasını render eden rota
router.get('/home', renderHomePage);

// Şifre değiştirme sayfasını ve işlemini yöneten rotalar
router.get('/change-password', changePassword);
router.post('/change-password', changePassword);

export default router;
