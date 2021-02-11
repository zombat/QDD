const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		accountModel = require(`../models/account`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		resultLimit = 15,
		router = express.Router(),
		got = require(`got`),
		necXML = require(`../nec-xml`);

router.get(`/js/:id`, (req, res) => {
	res.sendFile( `/private/system-administration/js/` + req.params.id, { root: `./` });
});

router.get(`/`, (req, res) => {

	let date = new Date();
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.STATISTICS_COLLECTION).insertOne({ timeStamp: date, reqHeaders: req.headers, urlAccessed: `/directory-app` }, (err, res) => {
		assert.equal(null, err);
	});
	mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).find({}).toArray((err, configurationArray) => {
		assert.equal(null, err);
		res.render(`system-administration-app`, { user: req.user, userPermissions: req.userPermissions, info: { ip: req.headers[`x-forwarded-for`] }, configurationItemsArray: configurationArray });
	});
});

router.get(`/user-management`, (req, res) => {
	if(req.query.hasOwnProperty(`refresh`) && req.query.refresh == `true`){
		mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`accounts`).find({}).project({ username: 1 }).toArray((err, accountsArray) => {
			assert.equal(null, err);
			res.json({accountsArray: accountsArray });
		});
	} else {
		let id = require(`mongodb`).ObjectID(req.query._id);
		mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`accounts`).findOne({ _id: id }, { projection: { tfa: 1, attempts: 1, username: 1 } }, (err, accountResponse) => {
			assert.equal(null, err);
			mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`user-permissions`).findOne({ _id: id }, { projection: { _id: 0, userPermissions: 1} }, (err, permissionResponse) => {
				assert.equal(null, err);
				accountResponse.userPermissions = permissionResponse.userPermissions;
				res.json(accountResponse);
			});
		});
	}
});

router.patch(`/user-management`, (req, res) => {
	if(req.body.hasOwnProperty(`userPermissions`)){
		if(req.body.userPermissions[`system-administration`] == `true`){
			for (var [key, value] of Object.entries(req.body.userPermissions)) {
				value = true;
			}
		} else {
			for (var [key, value] of Object.entries(req.body.userPermissions)) {
				if(value == `true`){
					req.body.userPermissions[key] = true;
				} else if(value == `false`){
					req.body.userPermissions[key] = false;
				}
			}
		}
		if(req.body.hasOwnProperty(`_id`) && req.body._id.length){
			let id = require(`mongodb`).ObjectID(req.body._id);
			delete req.body._id;
			mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`accounts`).updateOne({ _id: id}, { $set: { username: req.body.username.toLowerCase().trim() } }, (err, accountSetResponse) => {
				assert.equal(null, err);
				mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`user-permissions`).updateOne({ _id: id}, { $set: { userPermissions: req.body.userPermissions } }, (err, accountSetResponse) => {
					assert.equal(null, err);
					res.status(200);
					res.json({ success: true, _id: id });
				});
			});

		} else if(req.body.hasOwnProperty(`_id`) && !req.body._id.length) {
			let newPassword = generatePassword(12);
			accountModel.register(new accountModel({ username: req.body.username.toLowerCase().trim() }), newPassword, (err, user) => {
				if(err && err.name == `UserExistsError`){
					res.status(409);
					res.json({ success: false });
				} else {
					mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`user-permissions`).insertOne({ _id: user._id, userPermissions: req.body.userPermissions }, (err, mongoRes) => {
					assert.equal(null, err);
					res.status(201);
					res.json({ success: true, newUserName: req.body.username.toLowerCase().trim(), newPassword: newPassword, _id: user._id });
					});
				}
			});
		}
	}
});

router.delete(`/user-management`, (req, res) => {
	let id = require(`mongodb`).ObjectID(req.body._id);
	if(req.body.hasOwnProperty(`_id`) && req.body._id.length){
		mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`user-permissions`).deleteOne({ _id: id}, (err, mongoRes) => {
			assert.equal(null, err);
			if(err){
				res.status(410);
				res.json({ success: false });
			} else {
				mongoClient.get().db(process.env.MONGO_AUTH_DATABASE).collection(`accounts`).deleteOne({ _id: id}, (err, mongoRes) => {
					assert.equal(null, err);
					res.status(204);
					res.json({ success: true });
				});
			}

		});
	} else {
		res.status(418);
		res.json({ success: false });
	}
});

router.patch(`/update/:updateParam`, (req, res) => {
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
});

generatePassword = (requiredLength) => {
	var charArray = [`1`,`2`,`3`,`4`,`5`,`5`,`6`,`7`,`8`,`9`,`0`,`a`,`b`,`c`,`d`,`e`,`f`,`g`,`h`,`i`,`j`,`k`,`l`,`m`,`n`,`o`,`p`,`q`,`r`,`s`,`t`,`u`,`v`,`w`,`x`,`y`,`z`,`A`,`B`,`C`,`D`,`E`,`F`,`G`,`H`,`I`,`J`,`K`,`L`,`M`,`N`,`O`,`P`,`Q`,`R`,`S`,`T`,`U`,`V`,`W`,`X`,`Y`,`Z`,`~`,`!`,`@`,`#`,`$`,`%`,`^`,`&`,`*`,`(`,`)`,`-`,`=`,`_`,`+`,`?`,`|`];
	var newPassword =``;
	while(newPassword.length < requiredLength){
		newPassword = newPassword + charArray[Math.floor(Math.random() * Math.floor(79))];
	}
	return(newPassword);
}

module.exports = router;
