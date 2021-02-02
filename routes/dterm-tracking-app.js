const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		router = express.Router(),
		pushServer = process.env.SERVER_URI,
		got = require(`got`);

// Does not close on DT730 (and probably all 700 series) phones
		
router.get(`/`, (req, res) => {
	mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `phone-banner-message`}, (err, mongoRes) => {
		assert.equal(null, err);
		if(mongoRes == null){
			necXML.generateTextPage(`Error`, `Page not found`, [[`Exit`, `XMLWindow:Finish`]], (textPage) => {
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end(textPage)
			});
		} else {
			necXML.generateTextPage(mongoRes.bannerTitle, mongoRes.bannerText, [[`Up`, `SoftKey:Up`],[`Down`, `SoftKey:Down`],[],[`Agree`, `XMLWindow:Finish`]], (textPage) => {
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end(textPage);
			});
			updateDtermIpAddress(req, [], (response) => {
			});
		}
	});
});

updateDtermIpAddress = (req, contextArray) => {
	if(req.headers[`user-agent`].split(`/`)[2] == `JadeDesi`){
		var hostAddress = req._remoteAddress.split(`ffff:`)[1];
	} else {
		var hostAddress = `[${req._remoteAddress}]`;
	}
	got(`http://${hostAddress}/header.cgi`).then(response => {	
		var document = {
			extension: req.headers[`user-agent`].split(`/`)[7],
			ipAddress: req._remoteAddress,
			macAddress: response.body.match(/\w\w:\w\w:\w\w:\w\w:\w\w:\w\w/)[0],
			hardwareVersion: response.body.match(/\d.\d.\d.\d/g)[0],
			firmwareVersion: response.body.match(/\d.\d.\d.\d/g)[1],
			rawHeaders: req.headers,
			locationContexts: contextArray,
			lastCheckin: new Date()
		};
		if(document.ipAddress.match(/::ffff:/)){
			document.ipAddress = document.ipAddress.replace(/::ffff:/,``);
		} 
		if(req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)){
			document.phoneSubModel = req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)[1];
		} else {
			document.phoneSubModel = ``;
		}		
		mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-devices`).findOne( { _id: response.body.match(/\d.\d.\d.\d/g)[0] }, (err, mongoRes) => { 
			assert.equal(null, err);
			if(mongoRes == null){
				mongoRes = { series: `Error` };
			}
			document.deviceSeries = mongoRes.series;
			mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`tracked-device-collection`).updateOne({ _id: document.extension }, { $set:  document } , { upsert: true }, (err, res) => {
				assert.equal(null, err);
			});	
		});				
	});
}

module.exports = router;