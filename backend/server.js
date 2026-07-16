const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = class Server {
	/**
	 * @param {number} port
	 * @param {(app: import('express').Express) => void} [callback]
	 */
	constructor(port, dirname, callback) {
		this.app = express();
		this.port = port;
		this.dirname = dirname;

		// Serve json request bodies
		this.app.use(express.json());

		callback?.(this);

		// Serve static files from the 'public' directory
		this.app.use(express.static(`${dirname}/public`));

		// Start the server
		this.app.listen(this.port, () => console.log(`Running on port ${this.port}`));
	}

	/**
	 * Simple logging middleware
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 * @param {import('express').NextFunction} next
	 */
	useLogs() {
		this.app.use((req, res, next) => {
			console.log(`[${new Date().toLocaleString('fr-FR')}] ${req.url}`);
			next();
		});
	}

	/**
	 * HTML compilation middleware
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 * @param {import('express').NextFunction} next
	 */
	useHTML() {
		this.app.use((req, res, next) => {
			// Ignore non-HTML requests
			const ext = req.url.split('.').pop();
			if (ext !== 'html' && ext !== '/') return next();

			// Get file path
			let filePath = path.join(this.dirname, 'public', req.url);
			if (ext === '/') filePath = path.join(filePath, 'index.html');

			// Check if file exists
			if (!fs.existsSync(filePath)) return res.status(404).send(`File not found: ${filePath}`);

			// Read file
			let content = fs.readFileSync(filePath, 'utf-8');

			// COMPILATION LOGIC HERE //
			content = Server.compileHTML(content);

			// Send compiled HTML
			res.setHeader('Content-Type', 'text/html');
			res.send(content);
		});
	}

	/**
	 * Compile HTML with custom tags
	 * @param {string} content - Raw HTML content
	 * @returns {string} - Compiled HTML content
	 */
	static compileHTML(content) {
		// Set default language attribute
		content = content.replace(/<html([^>]*)>/, '<html lang="en"$1>');

		// Global tags to inject at the beginning of head
		const globalTags = html`
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />

			<!-- Web App Manifest -->
			<link rel="manifest" href="/manifest.json" />

			<!-- Fonts -->
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
			<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&display=swap" rel="stylesheet" />
			<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />

			<!-- Common modules -->
			<script type="module" src="nolib/utils.js"></script>
			<script type="module" src="nolib/store.js"></script>
			<script type="module" src="nolib/components.js"></script>
		`;

		// Inject global tags after <head>
		content = content.replace(/(<head[^>]*>)/, `$1\n${globalTags}`);

		// Process icon tag
		content = content.replace(/<icon>([^<]+)<\/icon>/g, (match, iconName) => {
			return `<link rel="icon" href="https://icons.nosuite.fr/badge/${iconName.trim()}/none/ffffff/192/192" />`;
		});

		// Process title tag (convert to proper format)
		content = content.replace(/<title>([^<]+)<\/title>/g, (match, title) => {
			return `
				<title>${title}</title>
				<meta property="og:title" content="${title}" />
				<meta name="twitter:title" content="${title}" />
			`;
		});

		// Process description tag
		content = content.replace(/<description>([^<]+)<\/description>/g, (match, description) => {
			const desc = description.trim();
			return `
				<meta name="description" content="${desc}" />
				<meta property="og:description" content="${desc}" />
				<meta name="twitter:description" content="${desc}" />
			`;
		});

		// Process image tag
		content = content.replace(/<image>([^<]+)<\/image>/g, (match, imageUrl) => {
			return `
				<meta property="og:image" content="${imageUrl.trim()}" />
				<meta name="twitter:image" content="${imageUrl.trim()}" />
			`;
		});

		// Process common-components tag
		content = content.replace(/<common-components\s+srcs="([^"]+)"\s*\/>/g, (match, srcs) => {
			const components = srcs.split(',').map(s => s.trim());
			return components.map(comp => `<script src="common/components/${comp}.js" defer></script>`).join('\n');
		});

		// Process local-components tag
		content = content.replace(/<local-components\s+srcs="([^"]+)"\s*\/>/g, (match, srcs) => {
			const components = srcs.split(',').map(s => s.trim());
			return components.map(comp => `<script src="./components/${comp}.js" defer></script>`).join('\n');
		});

		// Return compiled content
		return content;
	}
};
