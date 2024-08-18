import express from 'express';
import session from 'express-session';
import db from './db.js';
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import env from "dotenv";
import flash from 'connect-flash';

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10;
env.config();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const userQuery = 'SELECT * FROM users WHERE username = $1';
            const { rows } = await db.query(userQuery, [username]);

            if (rows.length === 0) {
                return done(null, false, { message: 'Yanlış kullanıcı adı veya şifre' });
            }

            const user = rows[0];

            if (!user.password.startsWith('$2b$')) {
                if (user.password === password) {
                    const hashedPassword = await bcrypt.hash(password, saltRounds);
                    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
                    return done(null, { id: user.id });
                } else {
                    return done(null, false, { message: 'Yanlış kullanıcı adı veya şifre' });
                }
            } else {
                const match = await bcrypt.compare(password, user.password);
                if (match) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Yanlış kullanıcı adı veya şifre' });
                }
            }
        } catch (error) {
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        const user = result.rows[0];
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

app.get('/', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    else{
        return res.redirect('/home')
    }
});

app.get('/add-serie', (req, res) => {
    res.render('add-serie');
});

app.get('/add-movie', (req, res) => {
    res.render('add-movie');
});

app.get('/login', (req, res) => {
    res.render('login', { error: req.flash('error') });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

app.get('/series/:id', (req, res) => getDetails(req, res, 'serie'));
app.get('/movies/:id', (req, res) => getDetails(req, res, 'movie'));


app.post('/login', (req, res, next) => {
    if (!req.session.failedLoginAttempts) {
        req.session.failedLoginAttempts = 0;
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.session.failedLoginAttempts += 1;

            if (req.session.failedLoginAttempts >= 3) {
                return res.redirect('/register');
            }

            req.flash('error', info.message || 'Yanlış kullanıcı adı veya şifre');
            return res.redirect('/login');
        }

        req.session.failedLoginAttempts = 0;
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/home');
        });
    })(req, res, next);
});

app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkResult.rows.length > 0) {
            return res.redirect("/login");
        } else {
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const result = await db.query(
                "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
                [email, hashedPassword]
            );

            const user = result.rows[0];

            req.login(user, (err) => {
                if (err) {
                    console.error("Error logging in user:", err);
                    return res.status(500).send("Internal Server Error");
                }
                return res.redirect("/secrets");
            });
        }
    } catch (err) {
        console.error("Error during registration:", err);
        return res.status(500).send("Internal Server Error");
    }
});

async function getUserData(userId) {
    const seriesQuery = `
        SELECT s.id, s.title, s.director, s.cover_url
        FROM series s
        JOIN user_series us ON s.id = us.serie_id
        WHERE us.user_id = $1
    `;
    const { rows: favoriteSeries } = await db.query(seriesQuery, [userId]);

    const moviesQuery = `
        SELECT m.id, m.title, m.director, m.cover_url
        FROM movies m
        JOIN user_movies um ON m.id = um.movie_id
        WHERE um.user_id = $1
    `;
    const { rows: favoriteMovies } = await db.query(moviesQuery, [userId]);

    const usernameQuery = `
        SELECT id, username, email FROM users
        WHERE id = $1
    `;
    const { rows: usernames } = await db.query(usernameQuery, [userId]);

    return { favoriteSeries, favoriteMovies, usernames: usernames[0] };
}


app.get('/home', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        const userData = await getUserData(req.user.id);
        res.render('home', userData);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
});


const addItem = async (req, res, type) => {
    const { id, title, director, genre, release_year, cover_url, summary } = req.body;

    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        
        const insertQuery = `
            INSERT INTO ${type}s (id, title, director, genre, release_year, cover_url, summary)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;
        const { rows } = await db.query(insertQuery, [id, title, director, genre, release_year, cover_url, summary]);
        const itemId = rows[0].id;
 
        const userTable = `user_${type}s`;
        const insertUserQuery = `
            INSERT INTO ${userTable} (user_id, ${type}_id)
            VALUES ($1, $2);
        `;
        await db.query(insertUserQuery, [req.user.id, itemId]);
        
        const redirectPage = type === 'serie' ? '/add-serie' : '/home';
        res.redirect(redirectPage);
    } catch (error) {
        console.error(`Error registering ${type}:`, error);
        res.status(500).send('Internal Server Error');
    }
};
app.post('/add-serie', (req, res) => addItem(req, res, 'serie'));
app.post('/add-movie', (req, res) => addItem(req, res, 'movie'));


const getDetails = async (req, res, type) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).send('Invalid ID');
    }

    try {
       
        const tableName = type === 'serie' ? 'series' : 'movies'; 
        const query = `SELECT * FROM ${tableName} WHERE id = $1`;
        const { rows } = await db.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).send(`${type.charAt(0).toUpperCase() + type.slice(1)} not found`);
        }

        const item = rows[0];
        res.render(`${type}-details`, { [type]: item });
    } catch (error) {
        console.error(`Error fetching ${type} details:`, error);
        res.status(500).send('Internal Server Error');
    }
};


const removeFavorite = async (req, res, type) => {
    const id = req.body[`${type}Id`];

    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        const tableName = type === 'serie' ? 'user_series' : 'user_movies';
        const column = type === 'serie' ? 'serie_id' : 'movie_id';

        const deleteQuery = `
            DELETE FROM ${tableName}
            WHERE user_id = $1 AND ${column} = $2;
        `;
        await db.query(deleteQuery, [req.user.id, id]);

        res.redirect('/home');
    } catch (error) {
        console.error(`Error removing favorite ${type}:`, error);
        res.status(500).send('Internal Server Error');
    }
};
app.post('/remove-favorite-movie', (req, res) => removeFavorite(req, res, 'movie'));
app.post('/remove-favorite-serie', (req, res) => removeFavorite(req, res, 'serie'));


app.post('/change-password', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const { currentPassword, newPassword } = req.body;

    try {
        const checkPasswordQuery = `
            SELECT * FROM users WHERE id = $1;
        `;
        const { rows: userRows } = await db.query(checkPasswordQuery, [req.user.id]);

        if (userRows.length === 0) {
            const userData = await getUserData(req.user.id);
            return res.render('home', { ...userData, error: 'Kullanıcı bulunamadı' });
        }

        const storedPassword = userRows[0].password;
        const isMatch = await bcrypt.compare(currentPassword, storedPassword);

        if (!isMatch) {
            const userData = await getUserData(req.user.id);
            return res.render('home', { ...userData, error: 'Mevcut şifre yanlış' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        const updatePasswordQuery = `
            UPDATE users
            SET password = $1
            WHERE id = $2;
        `;
        await db.query(updatePasswordQuery, [hashedNewPassword, req.user.id]);
        const userData = await getUserData(req.user.id);
        res.render('home', { ...userData, success: 'Şifre başarıyla güncellendi' });
    } catch (error) {
        console.error('Şifre değiştirilirken hata oluştu:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
