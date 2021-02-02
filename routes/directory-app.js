const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		router = express.Router();

router.get(`/js/:fileName`, (req, res) => {
	//var requestIP = req.headers[`x-forwarded-for`] || req.connection.remoteAddress;
		//if(req.hasOwnProperty(`user`)){
			//let userID = req.user[`_id`] || 0;
			//helperFunctions.getUserPermissions(userID, function(response){
				//if(response!=null){
					//if(response.betterTac){
						res.sendFile( `/private/directory-app/js/` + req.params.fileName, { root: `./` });
					//} 
				//}
			//});		
		//} 
});

router.get(`/`, (req, res) => {
	let date = new Date();
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.STATISTICS_COLLECTION).insertOne({ timeStamp: date, reqHeaders: req.headers, urlAccessed: `/directory-app` }, (err, res) => {
		assert.equal(null, err);
	});
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).distinct(`locationContexts`, (err, locationContextArray) => {
		assert.equal(null, err);
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).distinct(`contactMethods.contactMethodName`, (err, contactMethodArray) => {
			assert.equal(null, err);
			res.render(`directory-app`, { user: req.user, info: { ip: req.headers[`x-forwarded-for`] }, locationContexts: locationContextArray, contactMethodNames: contactMethodArray });
		});
	});
}); 		
	
router.get(`/SearchDB/:searchString`, (req, res) => {
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).find({ $or: [ { firstName: { $regex: `^${req.params.searchString}`, $options: `i` } }, { lastName: { $regex: `^${req.params.searchString}`, $options: `i` } }, { locationContexts: { $in: [ req.params.searchString.toLowerCase().replace(/ /g,`-`) ]} }	] }).sort({ firstName: 1, lastName : 1}).toArray((err, documents) => {
		assert.equal(null, err);
		res.setHeader(`Content-Type`, `application/json`);
		res.end(JSON.stringify(documents));
	});
});		
	
router.get(`/SearchID`, (req, res) => {
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION, (err, collection) => { 
		let id = require(`mongodb`).ObjectID(req.query._id);
		collection.find({ _id :  id }).toArray((err, documents) => {
			assert.equal(null, err);
			res.setHeader(`Content-Type`, `application/json`);
			res.end(JSON.stringify(documents));
		});
	});
});

router.patch(`/UpdateRecord`, (req, res) => {	
	let date = new Date();
	let updateObject = req.body;
	updateObject.lastUpdated = date;
	if(req.body._id == ``){
		delete updateObject._id;
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).insertOne(updateObject, (err, mongoResponse) => {
			assert.equal(null, err);
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).distinct(`locationContexts`, (err, locationContextArray) => {
				assert.equal(null, err);
				mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).distinct(`contactMethods.contactMethodName`, (err, contactMethodArray) => {
					assert.equal(null, err);
					res.setHeader(`Content-Type`, `application/json`);
					res.end(JSON.stringify({ response: mongoResponse, locationContextArray: locationContextArray, contactMethodArray: contactMethodArray }));
				});
			});
		});
	} else {
		let id = require(`mongodb`).ObjectID(updateObject._id);
		delete updateObject._id;
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).updateOne({ _id :  id }, { $set : updateObject }, (err, mongoResponse) => {
			assert.equal(null, err);
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).distinct(`locationContexts`, (err, locationContextArray) => {
				assert.equal(null, err);
				mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).distinct(`contactMethods.contactMethodName`, (err, contactMethodArray) => {
					assert.equal(null, err);
					res.setHeader(`Content-Type`, `application/json`);
					res.end(JSON.stringify({ response: mongoResponse, locationContextArray: locationContextArray, contactMethodArray: contactMethodArray }));
				});
			});
		});
	}
}); 
	
router.post(`/InsertRecord`, (req, res) => {
	let date = new Date();
	let updateObject = req.body;
	updateObject.lastUpdated = date;
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).insertOne(updateObject , (err, mongoResponse) => {
		assert.equal(null, err);
		res.setHeader(`Content-Type`, `application/json`);
		res.end(JSON.stringify(mongoResponse));
	});
});	
	
router.delete(`/RemoveRecord`, (req, res) => {
	let updateObject = req.body;
	updateObject._id = require(`mongodb`).ObjectID(updateObject._id);
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).deleteOne({ _id :  updateObject._id }, (err, mongoResponse) => {
		assert.equal(null, err);
		res.setHeader(`Content-Type`, `application/json`);
		res.end(JSON.stringify(mongoResponse));
	});
});	
	
module.exports = router;