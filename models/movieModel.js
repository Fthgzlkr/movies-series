import db from '../db.js';

export const getMovieById = async (id) => {
    const query = 'SELECT * FROM movies WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
};

export const linkMovieToUser = async (userId, movieId) => {
    const query = 'INSERT INTO user_movies (user_id, movie_id) VALUES ($1, $2)';
    await db.query(query, [userId, movieId]);
};

export const getFavoriteMoviesByUserId = async (userId) => {
    const query = `
        SELECT m.*
        FROM movies m
        INNER JOIN user_movies um ON m.id = um.movie_id
        WHERE um.user_id = $1;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
};

export const addMovie = async (id, title, director, genre, release_year, cover_url, summary) => {
    const query = `
        INSERT INTO movies (id, title, director, genre, release_year, cover_url, summary)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `;
    const { rows } = await db.query(query, [id, title, director, genre, release_year, cover_url, summary]);
    return rows[0].id;
};


export const removeFavoriteMovie = async (userId, movieId) => {
    const query = 'DELETE FROM user_movies WHERE user_id = $1 AND movie_id = $2';
    await db.query(query, [userId, movieId]);
};

const MovieModel = {
    getMovieById,
    addMovie,
    linkMovieToUser,
    removeFavoriteMovie,
    getFavoriteMoviesByUserId,
};

export { MovieModel };
