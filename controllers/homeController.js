import { UserModel } from '../models/userModel.js';
import bcrypt from 'bcrypt';
import { SerieModel } from '../models/serieModel.js';
import { MovieModel } from '../models/movieModel.js';

export const renderHomePage = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        const userData = await UserModel.getUserById(req.user.id);
        const favoriteSeries = await SerieModel.getFavoriteSeriesByUserId(req.user.id);
        const favoriteMovies = await MovieModel.getFavoriteMoviesByUserId(req.user.id);
          
        console.log('User Data:', userData);
        console.log('Favorite Series:', favoriteSeries);
        console.log('Favorite Movies:', favoriteMovies);

        res.render('home', {userData,favoriteSeries,favoriteMovies});
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const changePassword = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const { currentPassword, newPassword } = req.body;

    try {
        const isMatch = await UserModel.validatePassword(req.user.id, currentPassword);
        if (!isMatch) {
            const userData = await UserModel.getUserById(req.user.id);
            return res.render('home', { ...userData, error: 'Mevcut şifre yanlış' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await UserModel.updateUserPassword(req.user.id, hashedNewPassword);
        const userData = await UserModel.getUserById(req.user.id);
        res.render('home', { ...userData, success: 'Şifre başarıyla güncellendi' });
    } catch (error) {
        console.error('Şifre değiştirilirken hata oluştu:', error);
        res.status(500).send('Internal Server Error');
    }
};
