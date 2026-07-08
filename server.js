//server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cranesData = require('./data/cranes.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Homepage
app.get('/', (req, res) => {
	const manufacturers = [...new Set(cranesData.map(c => c.manufacturer))].sort();

	// Get all hero images dynamically
	const heroesDir = path.join(__dirname, 'public/images/heroes');
	let heroFiles = [];

	try {
		heroFiles = fs.readdirSync(heroesDir)
			.filter(file => file.match(/\.(jpg|jpeg|png|webp)$/i)); // only images
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
        const manufacturerCompare = a.manufacturer.localeCompare(b.manufacturer);
        if (manufacturerCompare !== 0) return manufacturerCompare;
        return a.model.localeCompare(b.model);
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

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
