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

router.get(`/push-nec-phone-update`, (req, res) => {
	let protocolType = `https`;
	var sessionID = null;
	let hostAddress = req._remoteAddress;
	let adminPassword = `6633222`;
	mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `core-server-settings`}, (err, serverSettings) => {
			assert.equal(null, err);
			necXML.generateTextPage(`Updating`, `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\nDo not unplug any cables\nDevice will reboot when complete\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`, [], (textPage) => {
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end(textPage)
				if (hostAddress.match(`ffff:`)){
					hostAddress = req._remoteAddress.split(`ffff:`)[1];
				}
				if(hostAddress.match(`:`)){
					hostAddress =	`[${hostAddress}]`
				}
				try {
					logonDtermIP(protocolType, hostAddress, adminPassword, sessionID, req.headers[`user-agent`].split(`/`)[7], (returnedSessionID) => {
						sessionID = returnedSessionID;
					});
				} catch {

					/*
					protocolType = `http`;
					console.log(`Failing to HTTP`);
					httpGet(`${protocolType}://${hostAddress}/index.cgi?username=ADMIN&password=${adminPassword}`, sessionID, (sessionID) => {
						if(sessionID == null ){
							console.log(`Session ID: ${sessionID}`);
							httpGet(`${protocolType}://${hostAddress}/index.cgi?session=${sessionID}&set=all`, sessionID, (sessionID) => {
							});
						} else {
							sessionID = sessionID;
							got(`http://${hostAddress}/header.cgi`).then( (response) => {
								mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `core-server-settings`}, (err, serverSettings) => {
										assert.equal(null, err);
										mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-firmware`).findOne({ _id: response.body.match(/\d.\d.\d.\d/g)[0]}, (err, phoneFirmware) => {
											assert.equal(null, err);
											if(phoneFirmware != null){
												let upgradeURI = `${protocolType}://${hostAddress}/index.cgi?session=${sessionID}&download=423054e&trans=1&adr=${serverSettings.serverHostname}&type=ip&dir=&file=${phoneFirmware.firmwareName}&name=&pass=`;
												got(upgradeURI).then(response => {
													httpGet(`${protocolType}://${hostAddress}/index.cgi?session=${sessionID}&set=all`, sessionID, (sessionID) => {
													});
												}).catch(error => {
													httpGet(`${protocolType}://${hostAddress}/index.cgi?session=${sessionID}&set=all`, sessionID, (sessionID) => {
													});
												});
											} else {
												mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`tracked-device-collection`).updateOne({ _id: req.headers[`user-agent`].split(`/`)[7] }, { $set: { skipFirmwareUpdateCount: 999 } }, (err, deviceDocument) => {
													assert.equal(null, err);
													httpGet(`${protocolType}://${hostAddress}/index.cgi?session=${sessionID}&set=all`, sessionID, (sessionID) => {
													});
												});
											}
										});
									});
							});
						}
					});
					*/
				}
			});
		});
	});

//	logonDtermIP(protocolType, hostAddress, adminPassword, sessionID, (returnedSessionID) => {

logonDtermIP = (protocolType, hostAddress, adminPassword, sessionID, extension, callback) => {
	console.log(`Attempting to connect to ${hostAddress} via ${protocolType}`);
	httpGet(protocolType, `://${hostAddress}/index.cgi?username=ADMIN&password=${adminPassword}`, sessionID, (sessionID, protocolType) => {
		if(sessionID == null ){
		} else {
			sessionID = sessionID;
			got(`${protocolType}://${hostAddress}/header.cgi`).then( (response) => {
				mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `core-server-settings`}, (err, serverSettings) => {
						assert.equal(null, err);
						mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-firmware`).findOne({ _id: response.body.match(/\d.\d.\d.\d/g)[0]}, (err, phoneFirmware) => {
							assert.equal(null, err);
							if(phoneFirmware != null){
								let upgradeURI = `${protocolType}://${hostAddress}/index.cgi?session=${sessionID}&download=423054e&trans=1&adr=${serverSettings.serverHostname}&type=ip&dir=&file=${phoneFirmware.firmwareName}&name=&pass=`;
								got(upgradeURI).then(response => {
									httpGet(protocolType, `://${hostAddress}/index.cgi?session=${sessionID}&set=all`, sessionID, (sessionID, protocolType) => {
									});
								}).catch(error => {
									httpGet(protocolType, `://${hostAddress}/index.cgi?session=${sessionID}&set=all`, sessionID, (sessionID, protocolType) => {
									});
								});
							} else {
								mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`tracked-device-collection`).updateOne({ _id: extension }, { $set: { skipFirmwareUpdateCount: 999 } }, (err, deviceDocument) => {
									assert.equal(null, err);
									httpGet(protocolType, `://${hostAddress}/index.cgi?session=${sessionID}&set=all`, sessionID, (sessionID, protocolType) => {
									});
								});
							}
						});
					});
				});
		}
	});
}

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

trackPhoneViaSyslog = (serverHostname) => {
	server.on(`listening`, function () {
		var address = server.address();
		console.log(`Syslog server listening on  ${address.address}:${address.port}`);
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
	server.bind(514, serverHostname);
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

httpGet = (protocolType, uri, sessionID, callback) => {
	// Handle HTTP Get requests.
	got(protocolType + uri).then(response => {
		if(response.body.match(/Terminal is busy/)){
			callback(null, protocolType);
		} else {
			if(sessionID == null){
				callback(response.body.match(/session=(\w*)/)[1]);
			} else {
				console.log(`Session ID: ${sessionID}`);
				callback(sessionID, protocolType);
			}
		}
	}).catch(error => {
		if(protocolType.match(`https`)){
			console.log(`TLS Error - Attempting to connect to without certificate verification`);
			if (process.env.NODE_TLS_REJECT_UNAUTHORIZED == 1){
					process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
			}
			got(protocolType + uri).then(response => {
				if(response.body.match(/Terminal is busy/)){
					callback(null, protocolType);
				} else {
					if(sessionID == null){
						callback(response.body.match(/session=(\w*)/)[1], protocolType);
					} else {
						console.log(`Session ID: ${sessionID}`);
						callback(response.body.match(/session=(\w*)/)[1], protocolType);
					}
				}
			}).catch(error => {
				process.env.NODE_TLS_REJECT_UNAUTHORIZED = 1;
				console.log(`Https failure - Attempting UNSECURE http as last resort`);
				protocolType = `http`;
				got(protocolType + uri).then(response => {
					if(response.body.match(/Terminal is busy/)){
						callback(null, protocolType);
					} else {
						if(sessionID == null){
							callback(response.body.match(/session=(\w*)/)[1], protocolType);
						} else {
							console.log(`Session ID: ${sessionID}`);
							callback(response.body.match(/session=(\w*)/)[1], protocolType);
						}
					}
				}).catch(error => {
					console.log(`Error: ${protocolType}${uri} - ${error.name}`);
					callback(null, protocolType);
				});
			});
		} else {
			console.log(`Error: ${protocolType}${uri} - ${error.name}`);
			callback(null, protocolType);
		}
	});
}

module.exports = {
    router: router,
		phoneTracker: trackPhoneViaSyslog
};

//module.exports = router;
