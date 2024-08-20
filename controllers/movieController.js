import { MovieModel } from '../models/movieModel.js';

export const addMovie = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const { id, title, director, genre, release_year, cover_url, summary } = req.body;

    try {
        const newMovie = await MovieModel.addMovie(id, title, director, genre, release_year, cover_url, summary);
        await MovieModel.linkMovieToUser(req.user.id, newMovie.id);
        res.redirect('/home');
    } catch (error) {
        console.error('Error adding movie:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const getMovieDetails = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).send('Invalid ID');
    }

    try {
        const movie = await MovieModel.getMovieById(id);
        if (!movie) {
            return res.status(404).send('Movie not found');
        }
        res.render('movie-details', { movie });
    } catch (error) {
        console.error('Error fetching movie details:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const removeFavoriteMovie = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        await MovieModel.removeFavoriteMovie(req.user.id, req.body.movieId);
        res.redirect('/home');
    } catch (error) {
        console.error('Error removing favorite movie:', error);
        res.status(500).send('Internal Server Error');
    }
};
