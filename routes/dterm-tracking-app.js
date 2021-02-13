const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		router = express.Router(),
		pushServer = process.env.SERVER_URI,
		got = require(`got`),
		dgram = require(`dgram`),
		server = dgram.createSocket(`udp4`);

// Does not close on DT730 (and probably all 700 series) phones
router.get(`/`, (req, res) => {
	mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `phone-banner-message`}, (err, phoneBanner) => {
		assert.equal(null, err);
		updateDtermIpAddress(req, [], (updataAvalable) => {
			if(phoneBanner == null){
				necXML.generateTextPage(`Error`, `Page not found`, [[`Exit`, `XMLWindow:Finish`]], (textPage) => {
					res.writeHead(200, { 'Content-Type': `text/html` });
					res.end(textPage)
				});
			} else {
				if(updataAvalable) {
					mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `core-server-settings`}, (err, serverSettings) => {
							assert.equal(null, err);
							necXML.generateTextPage(phoneBanner.bannerTitle, phoneBanner.bannerText, [[`Up`, `SoftKey:Up`],[`Down`, `SoftKey:Down`],[],[`Agree`, `${serverSettings.serverProtocol}://${serverSettings.serverHostname}/track/update-nec-phone`]], (textPage) => {
								res.writeHead(200, { 'Content-Type': `text/html` });
								res.end(textPage);
							});
					});
				} else {
					necXML.generateTextPage(phoneBanner.bannerTitle, phoneBanner.bannerText, [[`Up`, `SoftKey:Up`],[`Down`, `SoftKey:Down`],[],[`Agree`, `XMLWindow:Finish`]], (textPage) => {
						res.writeHead(200, { 'Content-Type': `text/html` });
						res.end(textPage);
					});
				}
			}
		});
	});
});

router.get(`/update-nec-phone`, (req, res) => {
	mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `core-server-settings`}, (err, serverSettings) => {
			assert.equal(null, err);
			necXML.generateTextPage(`Update Available`, `There is an update available for your phone. Your phone and PC will not be available until the update is complete.\n\n!! Do not unplug any cables during the update !!`, [[`Cancel`, `${serverSettings.serverProtocol}://${serverSettings.serverHostname}/track/cancel-nec-phone-update`],[],[],[`Update`, `${serverSettings.serverProtocol}://${serverSettings.serverHostname}/track/push-nec-phone-update`]], (textPage) => {
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end(textPage)
			});
	});
});

router.get(`/cancel-nec-phone-update`, (req, res) => {
	mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`tracked-device-collection`).updateOne({ _id: req.headers[`user-agent`].split(`/`)[7] }, { $inc:  { skipFirmwareUpdateCount: 1 } }, (err, deviceDocument) => {
		assert.equal(null, err);
		mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `core-server-settings`}, (err, serverSettings) => {
				assert.equal(null, err);
				necXML.generateTextPage(`Update Postponed`, `You have postponed the update.\n\nPress Exit to continue.`, [[`Exit`,`XMLWindow:Finish`]], (textPage) => {
					res.writeHead(200, { 'Content-Type': `text/html` });
					res.end(textPage)
				});
		});
	});
});

updateDtermIpAddress = (req, contextArray, callback) => {
	// Update Dterm IP address and checks for firmware updates. Callback value of true indicates an update is available.
	console.log(`Update Dterm IP address`);
	if(req.headers[`user-agent`].split(`/`)[2] == `JadeDesi`){
		var hostAddress = req._remoteAddress.split(`ffff:`)[1];
	} else {
		var hostAddress = `[${req._remoteAddress}]`;
	}
	got(`http://${hostAddress}/header.cgi`).then(response => {
		var newDeviceDocument = {
			extension: req.headers[`user-agent`].split(`/`)[7],
			ipAddress: req._remoteAddress,
			macAddress: response.body.match(/\w\w:\w\w:\w\w:\w\w:\w\w:\w\w/)[0],
			hardwareVersion: response.body.match(/\d.\d.\d.\d/g)[0],
			firmwareVersion: response.body.match(/\d.\d.\d.\d/g)[1],
			rawHeaders: req.headers,
			locationContexts: contextArray,
			lastCheckin: new Date()
		};
		if(newDeviceDocument.ipAddress.match(/::ffff:/)){
			newDeviceDocument.ipAddress = newDeviceDocument.ipAddress.replace(/::ffff:/,``);
		}
		if(req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)){
			newDeviceDocument.phoneSubModel = req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)[1];
		} else {
			newDeviceDocument.phoneSubModel = ``;
		}
		mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-devices`).findOne( { _id: response.body.match(/\d.\d.\d.\d/g)[0] }, (err, necDeviceDocument) => {
			assert.equal(null, err);
			if(necDeviceDocument == null){
				necDeviceDocument = { series: `Error` };
			}
			newDeviceDocument.deviceSeries = necDeviceDocument.series;
			mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`tracked-device-collection`).findOneAndUpdate({ _id: newDeviceDocument.extension }, { $set:  newDeviceDocument } , { upsert: true, returnOriginal: false}, (err, deviceDocument) => {
				assert.equal(null, err);
				// Device Update
				mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `core-server-settings`}, (err, serverSettings) => {
					assert.equal(null, err);
					if((serverSettings.enablePhoneUpgrade && deviceDocument.value.hasOwnProperty(`skipFirmwareUpdateCount`) && deviceDocument.value.skipFirmwareUpdateCount < 3) || !deviceDocument.value.hasOwnProperty(`skipFirmwareUpdateCount`)){
						mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-firmware`).findOne( { _id: deviceDocument.value.hardwareVersion }, (err, firmwareInfo) => {
							assert.equal(null, err);
							if(firmwareInfo != null && firmwareInfo.hasOwnProperty(`version`)){
								if(checkVersion(deviceDocument.value.firmwareVersion, firmwareInfo.version)){
									callback(true);
								} else {
									callback(false);
								}
							}
						});
					} else {
						callback(false);
					}
				});
			});
		});
	});
}

trackPhoneViaSyslog = () => {
	// Log phones via SV9500 - I have no idea if NEC will be alright with this.
	mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne( { _id: `syslog-server-settings` }, (err, syslogSettings) => {
		assert.equal(null, err);
		if(syslogSettings != null && syslogSettings.useSyslogReisterMethod == true){
			server.on('listening', function () {
				var address = server.address();
				console.log('UDP Server listening on ' + address.address + ":" + address.port);
			});

			server.on(`message`, function (message, remote) {
				let messageString = message.toString();
				if(messageString.match(/SUBSCRIBE/)){
					messageString.split(`\n`).forEach( (messageLine) =>{
						if(messageLine.match(/contact/i)){
							if(!messageLine.match(/sipphd/i)){
								let contactObject = {
									extension: messageLine.split(`@`)[0].split(`:`)[2],
									hostAddress: messageLine.split(`@`)[1].split(`:`)[0]
								}
								got(`http://${messageLine.split(`@`)[1].split(`:`)[0]}/header.cgi`).then(response => {
									var newDeviceDocument = {
										extension: messageLine.split(`@`)[0].split(`:`)[2],
										ipAddress: messageLine.split(`@`)[1].split(`:`)[0],
										macAddress: response.body.match(/\w\w:\w\w:\w\w:\w\w:\w\w:\w\w/)[0],
										hardwareVersion: response.body.match(/\d.\d.\d.\d/g)[0],
										firmwareVersion: response.body.match(/\d.\d.\d.\d/g)[1],
										rawHeaders: ``,
										phoneSubModel:	``,
										locationContexts: [],
										lastCheckin: new Date()
									};
									mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-devices`).findOne( { _id: response.body.match(/\d.\d.\d.\d/g)[0] }, (err, necDeviceDocument) => {
										assert.equal(null, err);
										if(necDeviceDocument == null){
											necDeviceDocument = { series: `Error` };
										}
										newDeviceDocument.deviceSeries = necDeviceDocument.series;
										mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`tracked-device-collection`).updateOne({ _id: newDeviceDocument.extension }, { $set:  newDeviceDocument } , { upsert: true }, (err, res) => {
											assert.equal(null, err);
										});
									});
								});
							}
						}
					});
				}
			});
			server.bind(514, `0.0.0.0`);
		}
	});
}

checkVersion = (runningVersion, availableVersion) => {
	let runningVersionArray = runningVersion.split(`.`);
	let availableVersionArray = availableVersion.split(`.`);
	let returnValue= false
	for (var i = 0; i < runningVersionArray.length; i++) {
		if(parseInt(runningVersionArray[i]) < parseInt(availableVersionArray[i])){
			return(true);
			i = runningVersionArray.length;
		}
	}
	return(returnValue);
}

module.exports = {
    router: router,
	phoneTracker: trackPhoneViaSyslog
};

//module.exports = router;
