require(`dotenv`).load();
const	assert = require(`assert`),
			cluster = require('cluster'),
			numCPUs = require('os').cpus().length,
			crypto = require(`crypto`),
			express = require(`express`),
			request = require(`request`),
			https = require(`https`),
			tftp = require(`tftp`),
			router = express.Router(),
			fs = require(`fs`),
	 		zlib = require('zlib'),
	  	tar = require('tar'),
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
			{ v4: uuidv4 } = require(`uuid`);

// Routes
const	directoryAppRoute = require(`./routes/directory-app`),
			dtermDirectoryAppRoute = require(`./routes/dterm-directory-app`),
			pushNotificationAppRoute = require(`./routes/push-notification-app`),
			dtermPushNotificationAppRoute = require(`./routes/dterm-push-notification-app`),
			dtermTrackingAppRoute= require(`./routes/dterm-tracking-app`),
			systemAdministrationRoute= require(`./routes/system-administration`),
			userManagementRoute= require(`./routes/user-management-app`);

// MongoDB Connection URI
if(process.env.MONGO_USER.length && process.env.MONGO_PASSWORD){
	var mongoUri = `mongodb://${encodeURIComponent(process.env.MONGO_USER)}:${encodeURIComponent(process.env.MONGO_PASSWORD)}@`;
}
if(process.env.MONGO_CONNECT_STRING.length){
	var mongoUri = `mongodb://${process.env.MONGO_CONNECT_STRING}`;
} else {
	var mongoUri = `mongodb://127.0.0.1`;
}
//
// Mongoose options
try {
	var	ca = fs.readFileSync(__dirname + `/.cert/${process.env.ROOT_CERT_FILE_NAME}`),
			// cert = fs.readFileSync(__dirname + `/.cert/${process.env.MONGO_CERT_FILE_NAME}`),
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

	// Connect to database
	mongoClient.connect(() => {
		console.log(`Connected to MongoDB`);

		app.use(`/directory-app`, ensureLoggedIn, getUserPermissions, directoryAppRoute);
		app.use(`/dtd`, dtermDirectoryAppRoute);
		app.use(`/push-notification-app`, ensureLoggedIn, getUserPermissions, pushNotificationAppRoute);
		app.use(`/dtp`, dtermPushNotificationAppRoute);
		app.use(`/track`, dtermTrackingAppRoute.router);
		app.use(`/system-administration`, ensureLoggedIn, getUserPermissions, systemAdministrationRoute);
		app.use(`/user-management-app`, ensureLoggedIn, getUserPermissions, userManagementRoute);

		// Initiate administrator account
		if(process.argv.indexOf(`--initAdminUser`) >= 0){
			if(process.argv.length == process.argv.indexOf(`--initAdminUser`)+1){
				console.log(`--initAdminUser requires a username, password, and password verification.\n\t\tnode server.js --initAdminUser [username] [password] [verifypassword]`);
				process.exit(0);
			} else if(process.argv[process.argv.indexOf(`--initAdminUser`)+2].trim() != process.argv[process.argv.indexOf(`--initAdminUser`)+3].trim()){
				console.log(`Password must match verification password`);
				process.exit(0);
			} else {
				accountModel.register(new accountModel({ username: process.argv[process.argv.indexOf(`--initAdminUser`)+1].toLowerCase().trim() }), process.argv[process.argv.indexOf(`--initAdminUser`)+2].trim(), (err, user) => {
					if(err && err.name == `UserExistsError`){
						console.log(err.message);
						process.exit(1);
					} else if(user != undefined){
						mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`user-permissions`).insertOne({ _id: user._id, userPermissions: { 'system-administration': true, 'user-management-app': true } }, (err, res) => {
						assert.equal(null, err);
						console.log(`Created Administrator Account:\n\tUser Name: ${user.username}`);
						process.exit(0);
						});
					} else {
						console.log(err);
						process.exit(1);
					}
				});
			}
		} else if(process.argv.indexOf(`--initDatabase`) >= 0){
			let deviceInformationDone = false;
			let globalVariablesDone = false;
			let deviceInformation = [
				{ _id: `9.1.3.0`, version: `5.0.9.0`, firmwareName: `itlisips.tgz`, series: `DT710`, models: [`SIP_ITL_2E`,`SIP_ITL_6DE`] },
				{ _id: `9.1.3.3`, version: `5.0.9.0`, firmwareName: `itlisipv.tgz`, series: `DT730`, models: [`SIP_ITL_12D`, `SIP_ITL_24D`, `SIP_ITL_32D`,`SIP_ITL_8LD`] },
				{ _id: `9.1.3.4`, version: `5.0.9.0`, firmwareName: `itlisipe.tgz`, series: `DT750`, models: [`SIP_ITL_320C`] },
				{ _id: `9.1.5.0`, version: `1.0.6.0`, firmwareName: `itlisipv.tgz`, series: `DT700G`, models: [`SIP_ITL_12DG`] },
				{ _id: `9.1.5.1`, version: `1.0.6.0`, firmwareName: `itlisipvc.tgz`, series: `DT700G`, models: [`SIP_ITL_2CG`] },
				{ _id: `9.1.6.1`, version: `5.2.3.0`, firmwareName: `itzisipvg.tgz`, series: `DT830`, models: [`SIP_ITZ_12DG`] },
				{ _id: `9.1.6.2`, version: `5.2.3.0`, firmwareName: `itzisipvc.tgz`, series: `DT830`, models: [`SIP_ITZ_12CG`] },
				{ _id: `9.1.7.0`, version: `5.2.6.0`, firmwareName: `ityisipe.tgz`, series: `DT820`, models: [`SIP_ITY_6D`] },
				{ _id: `9.1.7.1`, version: `3.2.6.0`, firmwareName: `ityisipex.tgz`, series: `DT820`, models: [`SIP_ITY_8LDX`] },
				{ _id: `9.1.7.2`, version: `3.2.6.0`, firmwareName: `ityisipec.tgz`, series: `DT800`, models: [`SIP_ITY_8LCX`] },
				{ _id: `9.1.8.0`, version: `2.3.0.0`, firmwareName: `itkisipe.tgz`, series: `DT900`, models: [`SIP_ITK_6D`,`SIP_ITK_12D`] },
				{ _id: `9.1.8.2`, version: `2.3.0.0`, firmwareName: `itkisipec.tgz`, series: `DT900`, models: [`SIP_ITK_8LCX`] },
				{ _id: `9.1.8.3`, version: `2.3.0.0`, firmwareName: `itkisiptc.tgz`, series: `DT900`, models: [`SIP_ITK_TCGX`] }
				];
				mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-devices`).insertMany(deviceInformation, (err, mongoRes) => {
					assert.equal(null, err);
					deviceInformationDone = true;
					if(deviceInformationDone && globalVariablesDone){
						process.exit(0);
						console.log(`Database Initialized`);
					}
				});

			let globalVariables = [
				{ _id: `phone-banner-message`, bannerTitle:`Notice to All Users`, bannerText :`STOP IMMEDIATELY if you do not agree to the conditions stated in this warning. This system is for authorized use only. Users have no explicit or implicit expectation of privacy. Any or all uses of this system and all data on this system may be intercepted, monitored, recorded, copied, audited, inspected, and disclosed to authorized sites and law enforcement personnel, as well as authorized officials of other agencies. By using this system, the user consent to such disclosure at the discretion of authorized site personnel. Unauthorized or improper use of this system may result in administrative disciplinary action, civil and criminal penalties. By continuing to use this system you indicate your awareness of and consent to these terms and conditions of use.`, note: `This can be displayed on an IP phone when booting, and is used as a MOTD and a quick way to track IP phone information.`},
				{ _id: `outside-number-prefix`, addPrefix: true, outsideAccessCode: `9`, countryCode: `1`, dialRules: `US`, note: `Define outside dialing rules. Only  US is supported at this time.`},
				{ _id: `core-server-settings`, serverHostname: `10.4.0.150`, serverProtocol: `http`, useSyslogReisterMethod: false, enablePhoneUpgrade: false },
				{ _id: `syslog-server-settings`, useSyslogReisterMethod: false, note: `Use experimental registration tracking from SV9500. Requires service restart, and configuration on PBX that will cause all stations to reregister.` }
			];
				mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).insertMany(globalVariables, (err, mongoRes) => {
					assert.equal(null, err);
					globalVariablesDone = true;
					if(deviceInformationDone && globalVariablesDone){
						process.exit(0);
						console.log(`Database Initialized`);
					}
				});
		} else {
			// Parse firmware files
				fs.readdir(`./private/firmware`, { withFileTypes: true }, (err, files) => {
					files.forEach((file, i) => {
							if(file.isFile() && file.name.match(/.tgz/)){
								let md5Hash = crypto.createHash('md5').update(fs.readFileSync(`./private/firmware/${file.name}`)).digest('hex');
								mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-firmware`).findOne({ md5Hash: md5Hash }, (err, mongoRes) => {
									assert.equal(null, err);
									if(mongoRes == null){
										console.log(`Found new firmware file: ${file.name} (${md5Hash})`);
										let fileContents = fs.createReadStream(`./private/firmware/${file.name}`);
										let writeStream = fs.createWriteStream(`./private/firmware/temp/${file.name.split(`.`)[0]}.tar`);;
										let unzip = zlib.createGunzip();
										var extraction = fileContents.pipe(unzip).pipe(writeStream);
										extraction.on(`finish`,() => {
											if (!fs.existsSync(`./private/firmware/temp/${file.name.split(`.`)[0]}`)){
												fs.mkdirSync(`./private/firmware/temp/${file.name.split(`.`)[0]}`);
												tar.x({ C: `./private/firmware/temp/${file.name.split(`.`)[0]}`, file: `./private/firmware/temp/${file.name.split(`.`)[0]}.tar` }, () =>{
													let updateDocument = { md5Hash: md5Hash, firmwareName: file.name };
													let findDocument = {};
													let directoryName =`./private/firmware/temp/${file.name.split(`.`)[0]}`
													fs.readdir(directoryName, { withFileTypes: true }, (err, files) => {
														files.forEach((file, i) => {
															if(file.isFile()){
																if(file.name.match(/fwver.txt/)){
																	let firmwareVersion = fs.readFileSync(`${directoryName}/${file.name}`).toString();
																	updateDocument.version = firmwareVersion.match(/\d*.\d*.\d*.\d*/)[0];
																}
																if(file.name.match(/hwver.txt/)){
																	let hardwareVersion = fs.readFileSync(`${directoryName}/${file.name}`).toString();
																	findDocument._id = hardwareVersion.match(/\d*.\d*.\d*.\d*/)[0];
																}
															}
														});
														if(!findDocument.hasOwnProperty(`_id`)){
															switch (updateDocument.firmwareName) {
																case `itlisips.tgz`:
																	findDocument._id = `9.1.3.0`;
																	break;
																case `itlisipv.tgz`:
																	findDocument._id = `9.1.3.3`;
																	break;
																case `itlisipe.tgz`:
																	findDocument._id = `9.1.3.4`;
																	break;
																default:
																findDocument.firmwareName = updateDocument.firmwareName;
															}
														}
													mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-firmware`).updateOne(findDocument, { $set: updateDocument }, { upsert: true }, (err, mongoRes) => {
														assert.equal(null, err);
														fs.rmdirSync(`./private/firmware/temp/${file.name.split(`.`)[0]}`, { recursive: true });
														fs.unlink(`./private/firmware/temp/${file.name.split(`.`)[0]}.tar`, () => {});
													});
												});
											});
										}
									});
								}
							});
					}
				});
			});

			// Start all required functions.
				mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `core-server-settings` }, (err, serverSettings) => {
					assert.equal(null, err);
					if(serverSettings.enableClustering){
						if (cluster.isMaster) {
							console.log(`Primary Thread (${process.pid}) is running`);

							// Fork workers.
							for (let i = 0; i < numCPUs; i++) {
								cluster.fork();
							}

							cluster.on('exit', (worker, code, signal) => {
								console.log(`worker ${worker.process.pid} died`);
							});
						} else {
							startServices(serverSettings);
						}
					} else {
						startServices(serverSettings);
					}
				});
		}

		// ----------------------------------------------------------------------------------------------------------------------  Web Interface Routes

		app.get(`/login`, (req, res) => {
		//	if(req.user.hasOwnProperty(`userPermissions`)){
			//	res.redirect(`/`);
			//} else {
				res.render(`login-page`, { user: req.user });
		//	}
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

		app.get(`/`, getUserPermissions, (req, res) => {
			if(req.hasOwnProperty(`userPermissions`)){
				res.render(`home-page`, { user: req.user, userPermissions: req.userPermissions });
			} else {
				res.render(`home-page`, { user: req.user });
			}
		});

	});
	// ----------------------------------------------------------------------------------------------------------------------  End of mongoClient.connect()



// ----------------------------------------------------------------------------------------------------------------------  Functions

getUserPermissions = (req, res, next) => {
	if(req.hasOwnProperty(`user`)){
		mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`user-permissions`).findOne({ _id: req.user._id }, (err, mongoRes) => {
			req.userPermissions = mongoRes.userPermissions;
			if(mongoRes.userPermissions[req.baseUrl.replace(/\//g,``)] || req.baseUrl == `` || req.baseUrl == `/login`){
				next();
			} else {
				res.redirect(`/`);
			}
		});
	} else {
		next();
	}
}

displayMemoryUse = () => {
	let used = process.memoryUsage().heapUsed / 1024 / 1024;
	console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
	setTimeout( () => {
		displayMemoryUse();
	}, 2400);
}

startWebServer = () => {
	let httpsPort = 443;
	if(process.env.OVERRIDE_WEB_PORT && process.env.OVERRIDE_WEB_PORT.length){
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
		let httpPort = 80;
		app.listen(httpPort);
		console.log(`HTTP Server listening on port ${httpPort}`);
	}
}

startTftpServer = (serverHostname) => {
	var server = tftp.createServer ({
	  host: serverHostname,
	  port: 69,
	  root: `./private/firmware`,
	  denyPUT: true
	});
	server.listen();
	console.log(`Starting TFTP Server on ${server.host}:${server.port}`);
	server.on (`error`, (error) => {
	  // Errors from the main socket. The current transfers are not aborted.
	  console.log(error);
	});
	server.on (`request`, (req, res) => {
	  req.on (`error`, (error) => {
		// Error from the request. The connection is already closed.
		console.log(`[${req.stats.remoteAddress}:${req.stats.remotePort}] (${req.file} - ${error.message})`);
	  });
	});
}

startServices = (serverSettings) => {
	if(process.argv.indexOf(`--memoryUsage`) != -1){
		displayMemoryUse();
	}
	if(serverSettings.enablePhoneUpgrade){
		startTftpServer(serverSettings.serverHostname);
	}
	if(serverSettings.useSyslogReisterMethod){
		dtermTrackingAppRoute.phoneTracker(serverSettings.serverHostname);
	}
	startWebServer();
	console.log(`Worker ${process.pid} started`);
}
