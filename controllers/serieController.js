import { SerieModel } from '../models/serieModel.js';

export const addSerie = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const { id, title, director, genre, release_year, cover_url, summary } = req.body;

    try {
        const newSerie = await SerieModel.addSerie(id, title, director, genre, release_year, cover_url, summary);
        await SerieModel.linkSerieToUser(req.user.id, newSerie.id);
        res.redirect('/add-serie');
    } catch (error) {
        console.error('Error adding serie:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const getSerieDetails = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).send('Invalid ID');
    }

    try {
        const serie = await SerieModel.getSerieById(id);
        if (!serie) {
            return res.status(404).send('Serie not found');
        }
        res.render('serie-details', { serie });
    } catch (error) {
        console.error('Error fetching serie details:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const removeFavoriteSerie = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        await SerieModel.removeFavoriteSerie(req.user.id, req.body.serieId);
        res.redirect('/home');
    } catch (error) {
        console.error('Error removing favorite serie:', error);
        res.status(500).send('Internal Server Error');
    }
};
