import express from 'express';
import { addSerie, getSerieDetails, removeFavoriteSerie } from '../controllers/serieController.js';

const router = express.Router();

router.get('/add-serie', addSerie);
router.get('/series/:id', getSerieDetails);
router.post('/remove-favorite-serie', removeFavoriteSerie);

export default router;
