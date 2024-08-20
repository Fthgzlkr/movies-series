import express from 'express';
import { addMovie, getMovieDetails, removeFavoriteMovie } from '../controllers/movieController.js';

const router = express.Router();

router.get('/add-movie', addMovie);
router.get('/movies/:id', getMovieDetails);
router.post('/remove-favorite-movie', removeFavoriteMovie);

export default router;
