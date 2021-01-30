require(`dotenv`).load();
const	assert = require(`assert`),
		express = require(`express`),
		request = require(`request`),
		https = require(`https`),
		router = express.Router(),
		fs = require(`fs`),
		bodyParser = require(`body-parser`),
		mongo = require(`mongodb`).MongoClient,
		mongoClient = require(`./mongo-client`),	
		mongoose = require(`mongoose`),
		mongooseSchema = mongoose.Schema,
		passport = require(`passport`),
		accountModel = require(`./models/account`),
		localStrategy = require(`passport-local`).Strategy,
		session  = require(`express-session`),
		MongoStore = require(`connect-mongo`)(session),
		ensureLoggedIn = require(`connect-ensure-login`).ensureLoggedIn(),
		unexpectedResponse = `<DtermIPText title='Search Results'>\n<Text>Unexpected response</Text>\n<SoftKeyItem index='1' name='Back'><URI>SoftKey:Back</URI></SoftKeyItem></DtermIPText>`,
		deviceInformation = {
		'9.1.3.0' : { version: `5.0.9.0`, firmwareName: `itlisips.tgz`,	series: `DT710`, models: [`SIP_ITL_2E`,`SIP_ITL_6DE`]},
		'9.1.3.3' : { version: `5.0.9.0`, firmwareName: `itlisipv.tgz`, series: `DT730`, models: [`SIP_ITL_12D`, `SIP_ITL_24D`, `SIP_ITL_32D`,`SIP_ITL_8LD`]},
		'9.1.3.4' : { version: `5.0.9.0`, firmwareName: `itlisipe.tgz`, series: `DT750`, models: [`SIP_ITL_320C`]},
		'9.1.5.0' : { version: `1.0.6.0`, firmwareName: `itlisipv.tgz`, series: `DT700G`, models: [`SIP_ITL_12DG`]},
		'9.1.5.1' : { version: `1.0.6.0`, firmwareName: `itlisipvc.tgz`, series: `DT700G`, models: [`SIP_ITL_2CG`]},
		'9.1.6.1' : { version: `5.2.3.0`, firmwareName: `itzisipvg.tgz`, series: `DT830`, models: [`SIP_ITZ_12DG`]},
		'9.1.6.2' : { version: `5.2.3.0`, firmwareName: `itzisipvc.tgz`, series: `DT830`, models: [`SIP_ITZ_12CG`]},
		'9.1.7.0' : { version: `5.2.6.0`, firmwareName: `ityisipe.tgz`, series: `DT820`, models: [`SIP_ITY_6D`]},
		'9.1.7.1' : { version: `3.2.6.0`, firmwareName: `ityisipex.tgz`, series: `DT820`, models: [`SIP_ITY_8LDX`]},
		'9.1.7.2' : { version: `3.2.6.0`, firmwareName: `ityisipec.tgz`	, series: `DT800`, models: [`SIP_ITY_8LCX`]},
		'9.1.8.0' : { version: `2.3.0.0`, firmwareName: `itkisipe.tgz`, series: `DT900`, models: [`SIP_ITK_6D`,`SIP_ITK_12D`]},
		'9.1.8.2' : { version: `2.3.0.0`, firmwareName: `itkisipec.tgz`, series: `DT900`, models: [`SIP_ITK_8LCX`]},
		//'9.1.8.2' : { version: `2.3.0.0`, firmwareName: `itkisipvc.tgz`, series `DT900`, models: [`SIP_ITK_24CG`]},
		'9.1.8.3' : { version: `2.3.0.0`, firmwareName: `itkisiptc.tgz`, series: `DT900`, models: [`SIP_ITK_TCGX`]}},
		{ v4: uuidv4 } = require(`uuid`);

// Routes
const	directoryAppRoute = require(`./routes/directory-app`),
		dtermDirectoryAppRoute = require(`./routes/dterm-directory-app`),
		pushNotificationAppRoute = require(`./routes/push-notification-app`),
		dtermPushNotificationAppRoute = require(`./routes/dterm-push-notification-app`);

// MongoDB Connection URI
if(process.env.MONGO_USER.length && process.env.MONGO_PASSWORD){
	var mongoUri = `mongodb://${encodeURIComponent(process.env.MONGO_USER)}:${encodeURIComponent(process.env.MONGO_PASSWORD)}@`;
}
if(process.env.MONGO_CONNECT_STRING.length){
	var mongoUri = `mongodb://${process.env.MONGO_CONNECT_STRING}`;
} else {
	var mongoUri = `mongodb://127.0.0.1`;
}

// Mongoose options
try {
	var	ca = fs.readFileSync(__dirname + `/.cert/${process.env.ROOT_CERT_FILE_NAME}`),
			cert = fs.readFileSync(__dirname + `/.cert/${process.env.MONGO_CERT_FILE_NAME}`),
			key = fs.readFileSync(__dirname + `/.cert/${process.env.MONGO_KEY_FILE_NAME}`)
			mongooseOptions = {
				ssl: true,
				sslValidate: true,
				sslCA: ca,
				sslCert: cert,
				sslKey: key,
				sslPass: sslPassword,
				useCreateIndex: true,
				useNewUrlParser: true,
				useFindAndModify: false,
				useUnifiedTopology:	true,
				dbName: process.env.MONGO_AUTH_DATABASE
			};
} catch {
	var	mongooseOptions = {
				useCreateIndex: true,
				useNewUrlParser: true,
				useFindAndModify: false,
				useUnifiedTopology:	true,
				dbName: process.env.MONGO_AUTH_DATABASE
			};
} finally {
	mongoose.connect(mongoUri, mongooseOptions);
}

if(process.env.HTTPS.match(/true/i)){
	var serverUri = `https://${process.env.SERVER_URI}`;
} else {
	var serverUri = `http://${process.env.SERVER_URI}`;
}

// Configure Passport authenticated session persistence.
passport.use(new localStrategy(accountModel.authenticate()));
passport.serializeUser(accountModel.serializeUser());
passport.deserializeUser(accountModel.deserializeUser());

var app = express();

app.use(`/public`, express.static(`${process.cwd()}/public`));

// Configure body-parser
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

// Configure view engine to render EJS templates.
app.set(`views`, `${__dirname}/views`);
app.set(`view engine`, `ejs`);

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require(`morgan`)(`combined`));
app.use(require(`cookie-parser`)());
app.use(require(`body-parser`).urlencoded({ extended: true }));
//app.use(require(`express-session`)({ secret: process.env.SESSION_SECRET, cookie: { maxAge: 900, expires: false }, resave: true, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.

app.use(session({ 
	secret: process.env.SESSION_SECRET,
	resave: true,
	rolling: true,
	saveUninitialized: false,
	//proxy: true,
	//secureProxy: true,
	cookie: {
		_expires: 900000,
		secure: false,
		httpOnly: true,
		domain: process.env.SERVER_URI
	},
	store: new MongoStore({ mongooseConnection: mongoose.connection,
          collection: process.env.SESSION_COLLECTION, })
	}));
app.use(passport.initialize());
app.use(passport.session());
//app.use((tfa));	
tweakUsername = (req, res, next) => {
	req.body.username = req.body.username.trim().toLowerCase();
	next();
}

// Connect to database before serving pages.
//mongo.connect(mongoUri, { useUnifiedTopology: true}, (err, client) => {
mongoClient.connect(() => {
	console.log(`Connected to MongoDB`);
	app.use(`/directory-app`, ensureLoggedIn, directoryAppRoute);
	app.use(`/dtd`, dtermDirectoryAppRoute);
	app.use(`/push-notification-app`, ensureLoggedIn, pushNotificationAppRoute);
	app.use(`/dtp`, dtermPushNotificationAppRoute);
	
	
	// Initiate administrator account
	if(process.argv.indexOf(`--initAdminUser`) >= 0){
		if(process.argv.length == process.argv.indexOf(`--initAdminUser`)+1){
			console.log(`--initAdminUser requires a username, password, and password verification.\n\t\tnode server.js --initAdminUser [username] [password] [verifypassword]`);
			process.exit(2);
		} else if(process.argv[process.argv.indexOf(`--initAdminUser`)+2].trim() != process.argv[process.argv.indexOf(`--initAdminUser`)+3].trim()){
			console.log(`Password must match verification password`);
			process.exit(2);
		} else {
			accountModel.register(new accountModel({ username: process.argv[process.argv.indexOf(`--initAdminUser`)+1].toLowerCase().trim() }), process.argv[process.argv.indexOf(`--initAdminUser`)+2].trim(), (err, accountCreationResponse) => {
				assert.equal(null, err);
				console.log(`Created Administrator Account:\n\tUser Name: ${accountCreationResponse.username}`);
			});
		}
	}
	
	// ----------------------------------------------------------------------------------------------------------------------  Web Interface Routes
	
	app.get(`/login`, (req, res) => {
		console.log(req.user);
		res.render(`login-page`, { user: req.user });
		});
	
	app.post(`/login`, tweakUsername, passport.authenticate(`local`, {
		successReturnToOrRedirect: `/`,	  
		failureRedirect: `/login`
		}), (req, res)  => {
			res.redirect(`/directory-app`);
		});
		
	app.get(`/logout`, (req, res) => {
		req.logout();
		res.redirect(`/`);
		});
	
	app.get(`/`, (req, res) => {
		res.render(`home-page`, { user: req.user });
		});
	
	app.get(`/settings`, ensureLoggedIn, (req, res) => {
		res.render(`settings`, { user: req.user });
		});
	
	app.post(`/test`, (req, res) => { 
		console.log(req.body);
		res.json({ end: true });
	});

});	

startHttpServer = () => {
	let httpPort = 80;
	if(process.env.OVERRIDE_WEB_PORT.length){
		httpPort = process.env.OVERRIDE_WEB_PORT;
	}
	app.listen(httpPort);
	console.log(`HTTP Server listening on port ${httpPort}`);
}

if(process.env.HTTPS == `true`){
	let httpsPort = 443;
	if(process.env.OVERRIDE_WEB_PORT.length){
		httpsPort = process.env.OVERRIDE_WEB_PORT;
	}
	try{
		https.createServer({
			key: fs.readFileSync(`./.cert/server.key`),
			cert: fs.readFileSync(`./.cert/server.crt`)
		}, app).listen(443, () => {
			console.log(`HTTPS listening on port 443`)
		});	
	} catch {
		console.log(`Error starting https, are cert files available?`);
		startHttpServer();
	}
} else {
	startHttpServer();
}