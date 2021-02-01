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
	let trackingPage  = `<DtermIPText title='Notice to All Users'>`;
		trackingPage += `<Text>STOP IMMEDIATELY if you do not agree to the conditions stated in this warning\n\nThis system is for authorized use only. Users have no explicit or implicit expectation of privacy. Any or all uses of this system and all data on this system may be intercepted, monitored, recorded, copied, audited, inspected, and disclosed to authorized sites and law enforcement personnel, as well as authorized officials of other agencies. By using this system, the user consent to such disclosure at the discretion of authorized site personnel. Unauthorized or improper use of this system may result in administrative disciplinary action, civil and criminal penalties. By continuing to use this system you indicate your awareness of and consent to these terms and conditions of use.</Text>`;
		trackingPage += `<SoftKeyItem index='1' name='Up'><URI>SoftKey:Up</URI></SoftKeyItem>`;
		trackingPage += `<SoftKeyItem index='2' name='Down'><URI>SoftKey:Down</URI></SoftKeyItem>`;
		trackingPage += `<SoftKeyItem index='4' name='Agree'><URI>XMLWindow:Finish</URI></SoftKeyItem>`;						
		trackingPage += `</DtermIPText>`;
	res.writeHead(200, { 'Content-Type': `text/html` });
	res.end(trackingPage);

	updateDtermIpAddress(req, [], (response) => {
		console.log(response);
	});
});

updateDtermIpAddress = (req, contextArray) => {
	if(req.headers[`user-agent`].split(`/`)[2] == `JadeDesi`){
		var hostAddress = req._remoteAddress.split(`ffff:`)[1];
	} else {
		var hostAddress = `[${req._remoteAddress}]`;
	}
	console.log(hostAddress);
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