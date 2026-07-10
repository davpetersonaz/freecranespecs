// server.js
const fs = require('fs');
const path = require('path');

const cors = require('cors');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const cranesData = require('./data/cranes.json');

const app = express();
const PORT = process.env.PORT || 3000;

// ====================== MIDDLEWARE ======================

// CORS - Allow only your own domain (safe for public site)
app.use(cors({
    origin: ['https://freecranespecs.com', 'https://www.freecranespecs.com'],
    methods: ['GET'],                    // Only allow GET requests
    allowedHeaders: ['Content-Type']
}));

// Helmet with strong CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ['\'self\''],
            scriptSrc: ['\'self\'', '\'unsafe-inline\''],   // EJS + inline scripts
            styleSrc: ['\'self\'', '\'unsafe-inline\''],
            imgSrc: ['\'self\'', 'data:'],
            objectSrc: ['\'none\''],
            frameSrc: ['\'none\''],                       // Block iframes
            upgradeInsecureRequests: [],                // Force HTTPS
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
}));

// Rate limiting on browse page
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150,                 // limit each IP to 150 requests
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);                   // Global limiter
app.use('/browse', limiter);        // Extra on browse if needed

// Body parsing (good to have even if not heavily used)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ====================== ROUTES ======================

// Homepage
app.get('/', (req, res) => {
	const manufacturers = [...new Set(cranesData.map(c => c.manufacturer))].sort();

	// Get all hero images dynamically
	const heroesDir = path.join(__dirname, 'public/images/heroes');
	let heroFiles = [];

	try {
		heroFiles = fs.readdirSync(heroesDir)
            .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
	} catch (err) {
		console.error('Could not read heroes folder:', err);
	}

	// Pick random hero
	const randomHero = heroFiles.length > 0 
		? heroFiles[Math.floor(Math.random() * heroFiles.length)]
		: 'crane-hero1.jpg'; // fallback

	res.render('index', { 
		manufacturers,
		totalSpecs: cranesData.length,
		heroImage: randomHero
	});
});

// Browse page
app.get('/browse', (req, res) => {
	let filtered = [...cranesData];
	const { manufacturer, model } = req.query;

	// Filter by manufacturer
	if (manufacturer) {
		filtered = filtered.filter(c => 
			c.manufacturer.toLowerCase() === manufacturer.toLowerCase()
		);
	}

	// Filter by model (using stripped field for fuzzy matching)
	if (model && model.trim() !== '') {
		const searchTerm = model.toUpperCase().replace(/[^A-Z0-9]/g, '');
		filtered = filtered.filter(c => 
			c.stripped.includes(searchTerm)
		);
	}

    // Sort alphabetically: First by Manufacturer, then by Model
    filtered.sort((a, b) => {
        const manCompare = a.manufacturer.localeCompare(b.manufacturer);
        return manCompare !== 0 ? manCompare : a.model.localeCompare(b.model);
    });

    // Get unique manufacturers for dropdown (already sorted)
	const manufacturers = [...new Set(cranesData.map(c => c.manufacturer))].sort();

	res.render('browse', { 
		cranes: filtered, 
		manufacturers,
		query: req.query 
	});
});

// Serve PDFs statically
app.use('/pdfs', express.static(path.join(__dirname, 'public/pdfs')));

// 404 handler (optional but nice)
app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});