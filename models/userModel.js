import db from '../db.js';
import bcrypt from 'bcrypt';

export const getUserById = async (id) => {
    const query = 'SELECT * FROM users WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
};

export const getUserByUsername = async (username) => {
    const query = 'SELECT * FROM users WHERE username = $1';
    const { rows } = await db.query(query, [username]);
    return rows[0];
};

export const getUserByEmail = async (email) => {
    const query = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
};

export const createUser = async (username,email, hashedPassword) => {
    const query = 'INSERT INTO users (username,email, password) VALUES ($1, $2,$3) RETURNING *';
    const { rows } = await db.query(query, [username,email, hashedPassword]);
    return rows[0];
};

export const updateUserPassword = async (id, hashedPassword) => {
    const query = 'UPDATE users SET password = $1 WHERE id = $2';
    await db.query(query, [hashedPassword, id]);
};


export const validatePassword = async (inputPassword, storedPassword) => {
    return await bcrypt.compare(inputPassword, storedPassword);
};

const UserModel = {
    getUserById,
    getUserByUsername,
    getUserByEmail,
    createUser,
    updateUserPassword,
    validatePassword  
};

export { UserModel };
