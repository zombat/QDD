const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		{ v4: uuidv4 } = require(`uuid`),
		router = express.Router(),
		pushServer = process.env.SERVER_URI,
		got = require(`got`),
		ipRange = require(`get-ip-range`),
		intervalTimer = 2000;
		
router.get(`/`, (req, res) => {
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).distinct(`locationContexts`, (err, locationContextArray) => {
		assert.equal(null, err);
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).distinct(`contactMethods.contactMethodName`, (err, contactMethodArray) => {
			assert.equal(null, err);
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.NOTIFICATION_TEMPLATES_COLLECTION).find({}).toArray((err, alertTemplateArray) => {
				assert.equal(null, err);
				locationContextArray.push(`all`);
				res.render(`push-notification-app`, { user: req.user, info: { ip: req.headers[`x-forwarded-for`] }, locationContexts: locationContextArray, contactMethodNames: contactMethodArray, alertTemplates: alertTemplateArray });
			});
		});
	});
});
	
router.post(`/:notifyfunction`, (req, res) => {
	let repeatCount = 0;
	if(req.body.hasOwnProperty(`repeatCount`) && req.body.repeatCount.match(/until cancelled/i)){
		repeatCount = `Until Cancelled`;
	} else if(req.body.hasOwnProperty(`repeatCount`) && parseInt(req.body.repeatCount) >= 0 && parseInt(req.body.repeatCount) < 11){
		repeatCount = parseInt( req.body.repeatCount);
	}
	
	// Set LED Color
	let ledColor = 1;
	if(req.body.hasOwnProperty(`ledColor`) && parseInt(req.body.ledColor) > 0 && parseInt(req.body.ledColor) < 9){
		ledColor = req.body.ledColor;
	} 
	
	let ringType = `0`;
	// Set Ring Type
	if(req.body.hasOwnProperty(`ringType`) && parseInt(req.body.ringType) >= 0 && parseInt(req.body.ringType) < 18){
		ringType = req.body.ringType;
	}  
	
	if(req.params.hasOwnProperty(`notifyfunction`)){
		// req.params[`notify-function`] is for API calls
		// req.body.ledColor sets LED color: 1~8
		// req.body.ringType sets ring tone: 1~17
		// req.body.destinationType: Context, Group, IP
		// req.body.destination: dependant on type
		// req.body.notificationTitle: String
		// req.body.notificationText: String
		if(req.params.notifyfunction ==`notifyfunction`){
			//console.log(`notify-function`);		
				
			if(req.body.hasOwnProperty(`destinationType`) && req.body.hasOwnProperty(`destination`) && req.body.destination.length && req.body.hasOwnProperty(`notificationTitle`) && req.body.notificationTitle.length && req.body.hasOwnProperty(`notificationText`) && req.body.notificationText.length){
				if(typeof req.body.destination == `string`){
					req.body.destination = [req.body.destination]
				}	
				let uuid = uuidv4();
				let alertDocument = {
					notificationTitle: req.body.notificationTitle,
					notificationText: req.body.notificationText,
					alertDestination: {
						type: req.body.destinationType,
						destination: req.body.destination
					},
					cancelled: false,
					repeatCount: repeatCount
				};
				let createdBy = {
					userID: req.user._id,
					userName: req.user.username,
					userIP: req._remoteAddress,
					userAgent: req.headers[`user-agent`]
				};		
				
				// Create alert
				mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.SENT_NOTIFICATION_COLLECTION).insertOne({ _id: uuid, created: new Date(), createdBy: createdBy, alertDocument}, (err, mongoRes) => { 
					assert.equal(null, err);
					if(mongoRes.insertedCount == 1){
						// Set up message
						if(req.body.notificationText == `%BLANK%`){
							var	pushMessage =`<DtermIPPush>`;
								pushMessage += `<PushItem type='0'>`;
								pushMessage += `<Window id='4' mode='Create' />`;
								pushMessage += `<URL>XMLWindow:Finish</URL>`;
								pushMessage += `</PushItem>\n`;
								pushMessage += `</DtermIPPush>`;
						} else {
							var	pushMessage  = `<DtermIPPush>`;
								pushMessage += `<PushLEDItem type='MW' color='${ledColor}'/>`;
							if(ringType != `0`){	
								pushMessage += `<PushRingItem number='${ringType}'/>`;
							}
								pushMessage += `<PushItem type='0'>`;
								pushMessage += `<Window id='4' mode='Create'/>`;
								pushMessage += `<URL>http://${pushServer}/dtp/${uuid}</URL>`;
								pushMessage += `</PushItem>\n`;
								pushMessage += `</DtermIPPush>`;	
						}
							
						if(req.body.destinationType.match(/location context/i)){
							mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`tracked-device-collection`).find({ locationContexts: { $in: req.body.destination } }).toArray((err, documents) => {
							//console.log(documents);
								assert.equal(null, err);
								//console.log(`Devices to notify: ${documents.length}`);
								//console.log(`Repeat count: ${repeatCount}`);
								if(documents.length){
									let notificationCount = documents.length;
									for(var i=0;i< documents.length;i++){
										let hostAddress = `${documents[i].ipAddress}`;
										if(hostAddress.match(/:/)){
											hostAddress = `[${hostAddress}]`;
										}										
										pushNotify(hostAddress, pushMessage, uuid, repeatCount, req.body.clearAfter);
									}
									res.json({ end: true, sentNotifications: documents.length });
								} else {
									//console.log(`no docs`);
									res.json({ end: true });
								}
							});
						} else if(req.body.destinationType.match(/ip address/i)){
							// Parse IP Addresses and send alerts
							if(req.body.destination.length > 1){
								// Comma separated IP list
								//console.log(`Multiple IP addresses found`);
								for(let i=0; i<req.body.destination.length;i++){
									//console.log(req.body.destination[i]);
									if(req.body.destination[i].match(/-/g)){
										if(require(`net`).isIP(req.body.destination[i].split(`-`)[0]) && require(`net`).isIP(req.body.destination[i].split(`-`)[1])){
											//console.log(`Nested IP range found`);
											ipRange.getIPRange(req.body.destination[i]).forEach((hostAddress) => {
												pushNotify(hostAddress, pushMessage, uuid, repeatCount, req.body.clearAfter);
											});
										}
									} else if(req.body.destination[i].match(`/`)){ 
										if(parseInt(req.body.destination[i].split(`/`)[1]) > 0 && parseInt(req.body.destination[i].split(`/`)[1]) < 32){
											if(require(`net`).isIP(req.body.destination[i].split(`/`)[0])){
												//console.log(`Nested CIDR found`);
												ipRange.getIPRange(req.body.destination[i]).forEach((hostAddress) => {
													pushNotify(hostAddress, pushMessage, uuid, repeatCount, req.body.clearAfter);
												});
											}
										}
									} else if(!require(`net`).isIP(req.body.destination[i])){
										//console.log(`Removed an invalid IP address: ${req.body.destination[i]}`);
										req.body.destination[i] = ``;
									}
									if(req.body.destination[i].length){
										pushNotify(req.body.destination[i], pushMessage, uuid, repeatCount, req.body.clearAfter);
									}
								}
								res.json({ end: true });
							} else if(req.body.destination[0].match(`/`)){
								// CIDR notation of subnet
								if(parseInt(req.body.destination[0].split(`/`)[1]) > 0 && parseInt(req.body.destination[0].split(`/`)[1]) < 32){
									if(require(`net`).isIP(req.body.destination[0].split(`/`)[0])){
										//console.log(`CIDR address detected: ${req.body.destination[0]}`);
										ipRange.getIPRange(req.body.destination[0]).forEach((hostAddress) => {
											pushNotify(hostAddress, pushMessage, uuid, repeatCount, req.body.clearAfter);
										});
										res.json({ end: true });
									} else {
										//console.log(`CIDR address detected, but IP DDN format is incorrect.`);
										res.json({ end: true });
									}
								} else {
									//console.log(`CIDR notation out of range: ${parseInt(req.body.destination[0].split(`/`)[1])}`);
									res.json({ end: true });
								}					
							} else if(req.body.destination[0].match(/-/g)){
								// Range of IPs
								if(req.body.destination[0].match(/-/g).length > 1){
									//console.log(`Too many dashes in range`);
									res.json({ end: true });
								} else {
									if(require(`net`).isIP(req.body.destination[0].split(`-`)[0]) && require(`net`).isIP(req.body.destination[0].split(`-`)[1])){
										//console.log(`IP range detected: ${req.body.destination}`);
										ipRange.getIPRange(req.body.destination[0]).forEach((hostAddress) => {
											pushNotify(hostAddress, pushMessage, uuid, repeatCount, req.body.clearAfter);
										});
										res.json({ end: true });
									} else {
										//console.log(`IP range detected, but IP DDN format is incorrect.`);
										res.json({ end: true });
									}
								}
							} else if(require(`net`).isIP(req.body.destination[0])){
								//console.log(`Single IP detected: ${req.body.destination}`);
								pushNotify(req.body.destination[0], pushMessage, uuid, repeatCount, req.body.clearAfter);
								res.json({ end: true });
							} else {
								//console.log(`Something went wrong`);
								//console.log(`\nreq.params`);
								//console.log(req.params);
								//console.log(`\nreq.query`);
								//console.log(req.query);
								//console.log(`\nreq.body`);
								//console.log(req.body);
								res.json({ end: true });
							}	
						} else {
							//console.log(`Something went wrong`);
							//console.log(`\nreq.params`);
							//console.log(req.params);
							//console.log(`\nreq.query`);
							//console.log(req.query);
							//console.log(`\nreq.body`);
							//console.log(req.body);
							res.json({ end: true });
						}
					} else {
						//console.log(`Something went wrong`);
						//console.log(`\nreq.params`);
						//console.log(req.params);
						//console.log(`\nreq.query`);
						//console.log(req.query);
						//console.log(`\nreq.body`);
						//console.log(req.body);
						res.json({ end: true });
					}
				});
			} else {
				//console.log(`Something went wrong`);
				//console.log(`\nreq.params`);
				//console.log(req.params);
				//console.log(`\nreq.query`);
				//console.log(req.query);
				//console.log(`\nreq.body`);
				//console.log(req.body);
				res.json({ end: true });
			}
		} else {
			//console.log(`Something went wrong`);
			//console.log(`\nreq.params`);
			//console.log(req.params);
			//console.log(`\nreq.query`);
			//console.log(req.query);
			//console.log(`\nreq.body`);
			//console.log(req.body);
			res.json({ end: true });
		}		
	} else {
		res.json({ end: true });
	}
});

router.patch(`/:patchInformation`, (req, res) => { 
	if(req.params.patchInformation == `update-alert-template`){
		if(req.body._id == ``){
			delete req.body._id;
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.NOTIFICATION_TEMPLATES_COLLECTION).insertOne( req.body, (err, mongoResponse) => {
				assert.equal(null, err);
				res.json({ end: true });
			});
		} else {
			query = {_id: require(`mongodb`).ObjectID(req.body._id)};
			delete req.body._id;
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.NOTIFICATION_TEMPLATES_COLLECTION).findOneAndUpdate( query, { $set: req.body}, { returnOriginal: false, upsert: true }, (err, updatedDocument) => {
				assert.equal(null, err);
				if(updatedDocument.value == null){	
					res.json({ end: true });
				} else { 
					res.json({ end: true });
				}
			});
		}
	}  else if(req.params.patchInformation == `cancel-active-alert`){
		let cancelledBy = {
			userID: req.user._id,
			userName: req.user.username,
			userIP: req._remoteAddress,
			userAgent: req.headers[`user-agent`]
		};
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.SENT_NOTIFICATION_COLLECTION).findOneAndUpdate( { _id: req.body._id }, { $set: { 'alertDocument.cancelled': true, cancelledTimeStamp: new Date(), cancelledBy: cancelledBy } }, { returnOriginal: false, upsert: true }, (err, updatedDocument) => {
			assert.equal(null, err);
			if(updatedDocument.value == null){	
				res.json({ end: true });				
			} else { 
				res.json({ end: true });
			}
		});
	} else {
		res.json({ end: true });
	}
});

router.delete(`/:deleteInformation`, (req, res) => { 
	if(req.params.deleteInformation == `delete-alert-template`){	
		var test = require(`mongodb`).ObjectID(req.body._id);
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.NOTIFICATION_TEMPLATES_COLLECTION).deleteOne({ _id : require(`mongodb`).ObjectID(req.body._id)  }, (err, mongoRes) => {
			assert.equal(null, err);
			res.json(mongoRes.deletedCount);
		});
	} else {
		res.json({ end: true });
	}
});

router.get(`/SearchAlerts/:searchString`, (req, res) => {
		if(req.params.searchString == `id`){
			if(req.query.alertType == `active-alert`){
				mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.SENT_NOTIFICATION_COLLECTION).findOne({ _id :  req.query._id },(err, document) => {
					assert.equal(null, err);
					res.json({ doucmentType: `active-alert`, document: document });
				});
			} else if(req.query.alertType == `alert-template`){
				let id = require(`mongodb`).ObjectID(req.query._id);
				mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.NOTIFICATION_TEMPLATES_COLLECTION).findOne({ _id :  id },(err, document) => {
					assert.equal(null, err);
					res.json({ doucmentType: `alert-template`, document: document });
				});
			}
		} else {
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.SENT_NOTIFICATION_COLLECTION).find({ $and: [ { 'alertDocument.cancelled': false }, { 'alertDocument.repeatCount': `Until Cancelled`} ]}).toArray((err, activeAlerts) => {
			assert.equal(null, err);
				mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.NOTIFICATION_TEMPLATES_COLLECTION).find( { notificationTitle: { $regex: `^${req.params.searchString}`, $options: `i` } }).sort({ notificationTitle: 1 }).toArray((err, alertTemplates) => {
					assert.equal(null, err);
					res.json({ activeAlerts: activeAlerts, alertTemplates: alertTemplates });
				});
			});
		}
});

pushNotify = (hostAddress, pushMessage, uuid, repeatCount, clearAfter) => {
	got.post(`http://${hostAddress}:82/cgi/Push.cgi`, { headers:{ 'Content-Type' : `application/x-www-form-urlencoded` }, body: pushMessage}).then(response => { 
		if(repeatCount > 0){
			setTimeout(() => {
				pushNotify(hostAddress, pushMessage, uuid, repeatCount-1, clearAfter);
			}, intervalTimer);
		} else if(typeof repeatCount == `string` && repeatCount.match(/until cancelled/i)){
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.SENT_NOTIFICATION_COLLECTION).findOne({ _id:  uuid, 'alertDocument.cancelled': false },(err, document) => {
				assert.equal(null, err);
				if(document != null){
					setTimeout(() => {
						pushNotify(hostAddress, pushMessage, uuid, repeatCount, clearAfter);
					}, intervalTimer);
				}
			});
		} else if(clearAfter == `true` && repeatCount >= 0){
			pushMessage  = `<DtermIPPush>`;
			pushMessage += `<PushItem type='0'>`;
			pushMessage += `<Window id='4' mode='Create' />`;
			pushMessage += `<URL>XMLWindow:Finish</URL>`;
			pushMessage += `</PushItem>\n`;
			pushMessage += `</DtermIPPush>`;
			setTimeout(() => {
				pushNotify(hostAddress, pushMessage, uuid, repeatCount-1, clearAfter);
			}, intervalTimer);
		}
	}).catch((err) => {
		//console.log(`No response from host: ${hostAddress}`);
	});;		
}
	
module.exports = router;