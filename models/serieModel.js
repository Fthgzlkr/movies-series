import db from '../db.js';

export const getSerieById = async (id) => {
    const query = 'SELECT * FROM series WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
};
export const linkSerieToUser = async (userId, serieId) => {
    const query = 'INSERT INTO user_series (user_id, serie_id) VALUES ($1, $2)';
    await db.query(query, [userId, serieId]);
};

export const getFavoriteSeriesByUserId = async (userId) => {
    const query = `
        SELECT s.*
        FROM series s
        INNER JOIN user_series us ON s.id = us.serie_id
        WHERE us.user_id = $1;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
};

export const addSerie = async (id, title, director, genre, release_year, cover_url, summary) => {
    const query = `
        INSERT INTO series (id, title, director, genre, release_year, cover_url, summary)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `;
    const { rows } = await db.query(query, [id, title, director, genre, release_year, cover_url, summary]);
    return rows[0].id;
};


export const removeFavoriteSerie = async (userId, serieId) => {
    const query = 'DELETE FROM user_series WHERE user_id = $1 AND serie_id = $2';
    await db.query(query, [userId, serieId]);
};


const SerieModel = {
    getSerieById,
    addSerie,
    linkSerieToUser,
    removeFavoriteSerie,
    getFavoriteSeriesByUserId,
};

export { SerieModel };
