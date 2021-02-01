const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		router = express.Router(),
		pushServer = process.env.SERVER_URI,
		// I really need to move this into Mongo...
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


updateDtermIpAddress = (req, contextArray, callback) => {
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
			deviceSeries: deviceInformation[response.body.match(/\d.\d.\d.\d/g)[0]].series,
			rawHeaders: req.headers,
			locationContexts: contextArray,
			lastCheckin: new Date()
		}
		if(document.ipAddress.match(/::ffff:/)){
			document.ipAddress = document.ipAddress.replace(/::ffff:/,``);
		} 
		console.log(document.ipAddress);
		if(req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)){
			document.phoneSubModel = req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)[1];
		} else {
			document.phoneSubModel = ``;
		}
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.PHONE_DATABASE_COLLECTION).updateOne({ _id: document.extension }, { $set:  document } , { upsert: true }, (err, res) => {
			assert.equal(null, err);
			callback(document);
		});		
	});
}

module.exports = router;