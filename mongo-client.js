require(`dotenv`).load();
const	mongoClient = require(`mongodb`).MongoClient,
		f = require(`util`).format,
		fs = require(`fs`);
let mongoDB;

// MongoDB Connection URI
let mongoUri = `mongodb://`;
if(process.env.MONGO_USER.length && process.env.MONGO_PASSWORD){
	mongoUri += `mongodb://${encodeURIComponent(process.env.MONGO_USER)}:${encodeURIComponent(process.env.MONGO_PASSWORD)}@`;
}
if(process.env.MONGO_CONNECT_STRING.length){
	mongoUri += process.env.MONGO_CONNECT_STRING;
} else {
	mongoUri += `127.0.0.1`;
}

function connect  (callback)  {
	try {
		ca = fs.readFileSync(__dirname + `/.cert/${process.env.ROOT_CERT_FILE_NAME}`),
		cert = fs.readFileSync(__dirname + `/.cert/${process.env.MONGO_CERT_FILE_NAME}`),
		key = fs.readFileSync(__dirname + `/.cert/${process.env.MONGO_KEY_FILE_NAME}`),
		sslPassword = process.env.SSL_PASSWORD;
		mongoClient.connect(mongoUri, {
			sslValidate:true,
			sslCA: ca,
			sslKey: key,
			sslCert: cert,
			sslPass: sslPassword,
			useUnifiedTopology: true
			}, (err, db) => {
				mongoDB = db;
				callback();
		});
	} catch {	
		mongoClient.connect(mongoUri, {
			sslValidate:true,
			useUnifiedTopology: true
			}, (err, db) => {
				mongoDB = db;
				callback();
		});
	}
}

function get  ()  {
    return mongoDB;
}

function close  ()  {
    mongoDB.close();
}

module.exports = {
    connect,
    get,
    close
};