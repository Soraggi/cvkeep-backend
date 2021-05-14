const config = require(`./config`);
global.__basedir = config.appBaseDir;

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const gzip = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const fileUploader = require('express-fileupload');
const bearerToken = require('express-bearer-token');
const i18n = require('./i18n');

const __fn = require('./functions/');
const __db = require('./database/');

/** app && /status **/

const app = express();
const routes = require('./endpoints/routes.js');

app.use(function(req, res, next) {
	const allowedOrigins = [config.clientURL, config.serverURL]
		.map(item => `${new URL(item).origin}/*`);

	if (config.extraAllowedOrigins) {
		const extraOrigins = config.extraAllowedOrigins
			.split(' ')
			.map(item => `${new URL(item).origin}/*`);

		allowedOrigins.push(...extraOrigins);
	}

	res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(' '));
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
	res.setHeader('Access-Control-Allow-Credentials', true);

	next();
});

app.use(cors({
	credentials: true,
	exposedHeaders: [
		'Access-Control-Allow-Origin',
		'Access-Control-Allow-Headers',
		'Access-Control-Allow-Methods',
		'Access-Control-Allow-Credentials,
	],

	origin: (origin, callback) => {
		const originBase = origin ? new URL(origin).origin : '';

		const allowedOrigins = [config.clientURL, config.serverURL]
			.map(item => new URL(item).origin);

		if (config.extraAllowedOrigins) {
			const extraOrigins = config.extraAllowedOrigins
				.split(' ')
				.map(item => new URL(item).origin);

			allowedOrigins.push(...extraOrigins);
		}

		if (origin && !allowedOrigins.includes(originBase)) {
			return callback(new Error('Origin blocked by CORS policy.'), false);
		}

		return callback(null, origin);
	},
}));

app.use(helmet());
app.use(bearerToken());
app.use(i18n.middleware);
app.use('/public', express.static(`${__dirname}/public`));
app.use(gzip());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(config.secret));
app.use(fileUploader({ createParentPath: true }));

app.use(config.base, routes);

/** init **/

if (config.stage === 'test') {
	app.fn = __fn;
	app.__db = __db;
	app.__basedir = config.appBaseDir;

	module.exports = app;
} else {
	app.listen(config.port, () => {
		console.log(`Server is running with stage "${ config.stage || 'development' }" on port ${config.port }`);
	});
}
