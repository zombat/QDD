const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		router = express.Router(),
		pushServer = process.env.SERVER_URI,
		mongoClient = require(`../mongo-client`);

router.get(`/:uuid`, (req, res) => {
	let document = {
		acknowledged: false,
		extension: req.headers[`user-agent`].split(`/`)[7],
		alertTimeStamp: new Date()
	};
	
	if(req.query.hasOwnProperty(`acknowlede`) && req.query.acknowlede == `true`){
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.SENT_NOTIFICATION_COLLECTION).findOne( { $and: [ { _id: req.params.uuid }, { alertedStations: { $elemMatch: { extension: document.extension, acknowledged: false } } } ] }, (err, returnDocument) => {
			let timeStamp = new Date();
			assert.equal(null, err);
			if(returnDocument == null){	
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end(`<DtermIPText title='DEBUG'><Text>Already acknowledged</Text></DtermIPText>`);
			} else {
				for(i=0;i<returnDocument.alertedStations.length;i++){
					if(returnDocument.alertedStations[i].extension == document.extension){
						returnDocument.alertedStations[i].acknowledged = true;
						returnDocument.alertedStations[i].acknowledgedTimeStamp = timeStamp;
					}
				}
				mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.SENT_NOTIFICATION_COLLECTION).updateOne( { _id: returnDocument._id}, { $set: returnDocument }, (err, mongoRes) => { 
					assert.equal(null, err);
					let acknowledgedText  = `<DtermIPText title='Acknowledged Alert'>`;
						acknowledgedText += `<Text>Acknowledged alert\n</Text>`;
						acknowledgedText += `<Text>Time: ${timeStamp}</Text>`;
						acknowledgedText += `<SoftKeyItem index='1' name='Exit'><URI>SoftKey:Exit</URI></SoftKeyItem>`;
						acknowledgedText += `</DtermIPText>`;
					res.writeHead(200, { 'Content-Type': `text/html` });
					res.end(acknowledgedText);
				});
			}				
		});
	} else {		
		// Log that the station displayed the alert.
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.SENT_NOTIFICATION_COLLECTION).findOneAndUpdate( { $and: [ { _id: req.params.uuid }, { alertedStations: { $not: { $elemMatch: { extension: document.extension } } } } ] }, { $push: { alertedStations: document } }, { returnOriginal: false }, (err, updatedDocument) => {
			assert.equal(null, err);
			if(updatedDocument.value == null){
				mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.SENT_NOTIFICATION_COLLECTION).findOne({ _id: req.params.uuid}, (err, returnDocument) => {
					if(returnDocument == null){
						let notificationText  = `<DtermIPText title='Alert Cleared'>`;
							notificationText += `<Text>The previous alert has been cleared or has expired\n</Text>`;
							notificationText += `<Text>Press Exit or Back to close this window.</Text>`;
							notificationText += `</DtermIPText>`;
						res.writeHead(200, { 'Content-Type': `text/html` });
						res.end(notificationText);
					} else {
						let notificationText  = `<DtermIPText title='${returnDocument.alertDocument.notificationTitle}'>`;
							notificationText += `<Text>${returnDocument.alertDocument.notificationText}\n\n</Text>`;
							notificationText += `<Text>Press Exit or Back to close this window, or press the Ack button to acknowlede this message.</Text>`;
							notificationText += `<SoftKeyItem index='4' name='Ack'><URI>http://${pushServer}/dtp/${req.params.uuid}?acknowlede=true</URI></SoftKeyItem>`;
							notificationText += `</DtermIPText>`;
						res.writeHead(200, { 'Content-Type': `text/html` });
						res.end(notificationText);
					}
				});
			} else if(updatedDocument.value.alertDocument.notificationText == `%BLANK%`){
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end('<Close />');
			} else {
				let notificationText  = `<DtermIPText title='${updatedDocument.value.alertDocument.notificationTitle}'>`;
					notificationText += `<Text>${updatedDocument.value.alertDocument.notificationText}\n\n</Text>`;
					notificationText += `<Text>Press Exit or Back to close this window, or press the Ack button to acknowlede this message.</Text>`;
					notificationText += `<SoftKeyItem index='4' name='Ack'><URI>http://${pushServer}/dtp/${req.params.uuid}?acknowlede=true</URI></SoftKeyItem>`;
					notificationText += `</DtermIPText>`;
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end(notificationText);
			}
		});
	}
});

module.exports = router;