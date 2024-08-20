import express from 'express';
import { renderHomePage } from '../controllers/homeController.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.redirect('/login'); // Anasayfayı /home yönlendirir
});

router.get('/home', renderHomePage);

export default router;
