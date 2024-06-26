const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		resultLimit = 15,
		router = express.Router()
		got = require(`got`),
		necXML = require(`../nec-xml`);

router.get(`/js/:id`, (req, res) => {
	res.sendFile( `/private/user-management/js/` + req.params.id, { root: `./` });
});

router.get(`/`, (req, res) => {
	let date = new Date();
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.STATISTICS_COLLECTION).insertOne({ timeStamp: date, reqHeaders: req.headers, urlAccessed: `/directory-app` }, (err, res) => {
		assert.equal(null, err);
	});
		mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`accounts`).find({}).project({ username: 1 }).toArray((err, accountsArray) => {
			assert.equal(null, err);
			res.render(`user-management-app`, { user: req.user, userPermissions: req.userPermissions, info: { ip: req.headers[`x-forwarded-for`] }, accountsArray: accountsArray });
		});
});

router.patch(`/user-management`, (req, res) => {
	console.log(req.body);
	console.log(req.query);
	console.log(req.params);
	/*
	if(req.params.updateParam == `global-variables`){
		req.body.data.forEach((eachVariable) => {
			let id = eachVariable._id;
			delete eachVariable._id;
			for (const [key, value] of Object.entries(eachVariable)) {
				if(value == `true`){
					eachVariable[key] = true;
				} else if(value == `false`){
					eachVariable[key] = false;
				}
			}
			mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).updateOne( { _id: id  },{ $set: eachVariable },(err,mongoRes) => {
				assert.equal(null, err);
			});
		});
		res.json({ end: true });
	} else {
		res.json({ end: true });
	}
	*/
});

module.exports = router;
