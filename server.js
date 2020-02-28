require('dotenv').config();
const request = require('superagent');

// Application Dependencies
const express = require('express');
// (add cors, pg, and morgan...)
const cors = require('cors');
const morgan = require('morgan');
const pg = require('pg');
const server = express();

console.log(process.env);
// Database Client
const Client = pg.Client;
// (create and connect using DATABASE_URL)
const client = new Client(process.env.DATABASE_URL);
client.connect();


// Application Setup
const app = express();
const PORT = process.env.PORT;
// (add middleware utils: logging, cors, static files from public)
// app.use(...)
app.use(morgan('dev'));
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Auth
const ensureAuth = require('./lib/auth/ensure-auth');
const createAuthRoutes = require('./lib/auth/create-auth-routes');
const authRoutes = createAuthRoutes({
    async selectUser(email) {
        const result = await client.query(`
            SELECT id, email, hash, display_name  
            FROM users
            WHERE email = $1;
        `, [email]);
        return result.rows[0];
    },
    async insertUser(user, hash) {
        console.log(user);
        const result = await client.query(`
            INSERT into users (email, hash, display_name)
            VALUES ($1, $2, $3)
            RETURNING id, email, display_name;
        `, [user.email, hash, user.display_name]);
        return result.rows[0];
    }
});

// setup authentication routes
app.use('/api/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api/me', ensureAuth);

app.get('/api', (req, res) => {
    res.send('are you working???');
});

//create a get route to the api
app.get('/api/characters', async (req, res) => {
    try {
        const data = await request.get(`https://rickandmortyapi.com/api/character/?name=${req.query.search}`);

        res.json(data.body);
    } catch (err) {
        console.error(err);
    }
});


//get favorites
app.get('/api/me/favorites', async (req, res) => {
    try {
        const myQuery = `
        SELECT * FROM favorites
        WHERE user_id=$1
    `;
        const favorites = await client.query(myQuery, [req.userId]);

        res.json(favorites.rows);

    } catch (err) {
        console.error(err);
    }
});

//create a post route
app.post('/api/me/favorites', async (req, res) => {
    try {
        const newFavorites = await client.query(`
            INSERT INTO favorites (name, user_id)
            VALUES ($1, $2)
            RETURNING *
        `,
        [req.body.name, req.userId]
        );

        res.json(newFavorites.rows[0]);

    } catch (err) {
        console.log(err);
    }
});

//add delete route- check code for query to update
app.delete('/api/me/favorites:id', async (req, res) => {
    try {
        const newFavorites = await client.query(`
            INSERT INTO favorites (name, user_id)
            VALUES ($1, $2)
            RETURNING *
        `,
        [req.body.name, req.userId]
        );

        res.json(newFavorites.rows[0]);

    } catch (err) {
        console.log(err);
    }
});

//start the server
app.listen(PORT, () => {
    console.log('server running PORT', PORT);
});

//set up export for testing 
module.exports = { server: server };