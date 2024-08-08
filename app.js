import express from 'express';
import session from 'express-session';
import db from './db.js';

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Express Session Middleware
app.use(session({
    secret: 'your-secret-key', // Güvenlik için benzersiz bir anahtar
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // HTTPS kullanılmadığı sürece false olarak ayarlayın
}));

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/add-serie', (req, res) => {
    res.render('add-serie');
});

app.get('/add-movie', (req, res) => {
    res.render('add-movie');
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.get('/register', (req, res) => {
    res.render('register');
});
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!req.session.failedLoginAttempts) {
        req.session.failedLoginAttempts = 0;
    }

    console.log(`Failed Login Attempts: ${req.session.failedLoginAttempts}`);

    try {
        const user = await db.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);

        if (user.rows.length > 0) {
            req.session.failedLoginAttempts = 0; // Başarılı girişte sayacı sıfırla
            req.session.userId = user.rows[0].id; // Kullanıcı ID'sini oturumda sakla
            return res.redirect('/home');
        }

        req.session.failedLoginAttempts += 1;

        console.log(`Failed Login Attempts after increment: ${req.session.failedLoginAttempts}`);

        if (req.session.failedLoginAttempts >= 3) {
            return res.render('login', { error: 'Üç defa hatalı giriş yaptınız. Lütfen kayıt olun.' });
        }

        res.render('login', { error: 'Yanlış kullanıcı adı veya şifre' });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).send('Internal Server Error');
    }
});





app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    const checkUserQuery = 'SELECT COUNT(*) FROM users WHERE username = $1';
    const { rows: checkRows } = await db.query(checkUserQuery, [username]);

    if (checkRows[0].count > 0) { 
        return res.render('register', { error: 'Username already exists' });
    } else {
        try {
            const insertUserQuery = `
                INSERT INTO users (username, password, email)
                VALUES ($1, $2, $3)
                RETURNING id;
            `;
            const { rows } = await db.query(insertUserQuery, [username, password, email]);
    
            req.session.userId = rows[0].id; // Kullanıcı ID'sini oturumda sakla
            res.redirect('/home');
        } catch (error) {
            console.error('Error registering user:', error);
            res.status(500).send('Internal Server Error');
        }
    }
});


app.post('/add-serie', async (req, res) => {
    const { id,title,director,genre,release_year,cover_url,summary} = req.body;

    if (!req.session.userId) {
        return res.redirect('/login');
    }
        try {
            const insertSerieQuery = `
                INSERT INTO series (id,title,director,genre,release_year,cover_url,summary)
                VALUES ($1, $2, $3,$4,$5,$6,$7)
                RETURNING id;
            `;
            const { rows } = await db.query(insertSerieQuery, [id, title,director,genre,release_year,cover_url,summary]);
            const serieId = rows[0].id;

            const insertUserSerieQuery = `
            INSERT INTO user_series (user_id, serie_id)
            VALUES ($1, $2);
        `;
        await db.query(insertUserSerieQuery, [req.session.userId, serieId]);
        res.redirect('/add-serie');
      } 
       catch (error) {
                     console.error('Error registering serie:', error);
                     res.status(500).send('Internal Server Error');
             }
    
});

app.post('/add-movie', async (req, res) => {
    const { id, title, director, genre, release_year, cover_url, summary } = req.body;

    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const insertMovieQuery = `
            INSERT INTO movies (id, title, director, genre, release_year, cover_url, summary)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;
        const { rows } = await db.query(insertMovieQuery, [id, title, director, genre, release_year, cover_url, summary]);
        const movieId = rows[0].id;

        const insertUserMovieQuery = `
            INSERT INTO user_movies (user_id, movie_id)
            VALUES ($1, $2);
        `;
        await db.query(insertUserMovieQuery, [req.session.userId, movieId]);
        res.redirect('/add-movie');
    } 
    catch (error) {
        console.error('Error registering movie:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/home', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        // Favorite series query
        const seriesQuery = `
            SELECT s.id, s.title, s.director, s.cover_url
            FROM series s
            JOIN user_series us ON s.id = us.serie_id
            WHERE us.user_id = $1
        `;
        const { rows: favoriteSeries } = await db.query(seriesQuery, [req.session.userId]);

        // Favorite movies query
        const moviesQuery = `
            SELECT m.id, m.title, m.director, m.cover_url
            FROM movies m
            JOIN user_movies um ON m.id = um.movie_id
            WHERE um.user_id = $1
        `;
        const { rows: favoriteMovies } = await db.query(moviesQuery, [req.session.userId]);

        res.render('home', { favoriteSeries, favoriteMovies });
    } catch (error) {
        console.error('Error fetching favorite series or movies:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/series/:id', async (req, res) => {
    const serieId = parseInt(req.params.id, 10);
    if (isNaN(serieId)) {
        return res.status(400).send('Invalid series ID');
    }

    try {
        const serieQuery = 'SELECT * FROM series WHERE id = $1';
        const { rows } = await db.query(serieQuery, [serieId]);

        if (rows.length === 0) {
            return res.status(404).send('Serie not found');
        }

        const serie = rows[0];
        res.render('serie-details', { serie });
    } catch (error) {
        console.error('Error fetching serie details:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/movies/:id', async (req, res) => {
    const movieId = req.params.id;

    try {
        const movieQuery = 'SELECT * FROM movies WHERE id = $1';
        const { rows } = await db.query(movieQuery, [movieId]);

        if (rows.length === 0) {
            return res.status(404).send('Movie not found');
        }

        const movie = rows[0];
        res.render('movie-details', { movie });
    } catch (error) {
        console.error('Error fetching movie details:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.post('/add-book', async (req, res) => {
    const { title, author, genre, published_year } = req.body;

    try {
        const insertBookQuery = `
            INSERT INTO books (title, author, genre, published_year)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (title, author) DO UPDATE
            SET genre = EXCLUDED.genre, published_year = EXCLUDED.published_year
            RETURNING id;
        `;
        const { rows } = await db.query(insertBookQuery, [title, author, genre, published_year]);
        const bookId = rows[0].id;

        const insertUserBookQuery = `
            INSERT INTO user_books (user_id, book_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING;
        `;
        await db.query(insertUserBookQuery, [req.session.userId, bookId]);

        res.redirect('/home');
    } catch (error) {
        console.error('Error adding book:', error);
        res.status(500).send('Internal Server Error');
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
