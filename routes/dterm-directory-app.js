const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		resultLimit = 15,
		router = express.Router()
		got = require(`got`);
		
if(process.env.HTTPS.match(/true/i)){
	var serverUri = `https://${process.env.SERVER_URI}`;
} else {
	var serverUri = `http://${process.env.SERVER_URI}`;
}

router.get(`/:context`, (req, res) => {
	let contextArray = [];
	if(req.params.context.match(/|/)){
		req.params.context.split(`|`).forEach((contextEntry) => {
			contextArray.push(contextEntry.toLowerCase().replace(/ /g,`-`));
		});
	} else {
		contextArray.push(req.params.context.toLowerCase().replace(/ /g,`-`));
	}
	contextArray.push(`emergency`);
	contextArray.push(`all`);
	// Log the request.
	let date = new Date();
	mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.STATISTICS_COLLECTION).insertOne({ timeStamp: date, reqHeaders: req.headers, urlAccessed: `DTerm Directory` }, (err, res) => {
		assert.equal(null, err);
		});
	if(req.query.hasOwnProperty(`support`) && req.query.support.match(/true/i)){
		let supportInformation = `<DtermIPText title='Support Information'>`;
			supportInformation += `<Text>Extension Number: ${req.headers['user-agent'].split('/')[7]}\n</Text>`;
			supportInformation += `<Text>IP Address: ${req._remoteAddress}\n</Text>`;
			supportInformation += `<Text>Location Contexts: ${contextArray.join(', ')}\n</Text>`;
			supportInformation += `<SoftKeyItem index='1' name='Back'><URI>SoftKey:Back</URI></SoftKeyItem>`;
			supportInformation += `</DtermIPText>`;
		res.writeHead(200, { 'Content-Type': `text/html` });
		res.end(supportInformation);
	} else if(req.query.hasOwnProperty(`browse`) && req.query.browse.match(/true/i) || req.query.hasOwnProperty(`skip`)){
		// Browse the directory
		if(!req.query.hasOwnProperty(`skip`) || req.query.skip < 0){
			req.query.skip = 0;
		} 
		let contextObject = {};
		if(contextArray.indexOf(`global`) == -0){
			contextObject = { locationContexts: { $in: contextArray }};
		}
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).find(contextObject).skip(parseInt(req.query.skip)).count((err, documentCount) => {
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).find(contextObject).skip(parseInt(req.query.skip)).limit(resultLimit).toArray((err, documents) => {
				if(documents.length === 0){
					// No search results.
					let noMatchScreen = `<DtermIPText title='Search Results'>\n`;
						noMatchScreen += `<Text>No directory results available.\n\nIf you feel that this is an error, please contact your system administrator.\n\nExtension Number: ${req.headers['user-agent'].split('/')[7]}\nDirectory Location Context: ${contextArray[0]}</Text>\n`;
						noMatchScreen += `<SoftKeyItem index='1' name='Back'><URI>SoftKey:Back</URI></SoftKeyItem>`;
						noMatchScreen += `</DtermIPText>`;
					res.writeHead(200, { 'Content-Type': `text/html` });
					res.end(noMatchScreen);
				} else {
					let directoryList = `<DtermIPList title='Browse' column='1'>\n`;
					assert.equal(null, err);			
						if(parseInt(req.query.skip) > 0){
							directoryList += `<ListItem name='...Previous Results'><URI>${serverUri}/dtd/${req.params.context}?skip=${req.query.skip - resultLimit}</URI></ListItem>`;
						}
					documents.forEach((document) =>{
						directoryList += `<ListItem name='${document.firstName} ${document.lastName}'><URI>${serverUri}/dtd/${req.params.context}?id=${document._id}</URI></ListItem>`;
						});
						if(documentCount > resultLimit){
							directoryList += `<ListItem name='More Results...'><URI>${serverUri}/dtd/${req.params.context}?skip=${parseInt(req.query.skip) + resultLimit}</URI></ListItem>`;
						}
						directoryList += `</DtermIPList>`;
						res.writeHead(200, { 'Content-Type': `text/html` });
						res.end(directoryList);
				}
			});
		});
	} else if(req.query.hasOwnProperty(`search`) && req.query.search.match(/true/i)) {
		// Display the search screen.
		res.writeHead(200, { 'Content-Type': `text/html` });
		res.end(searchDirectoryList(`Search`, req.params.context));
	} else if(req.query.searchString){
		var skipCount = 0;
		// Look, I know it's ugly... It's just that the phone hates having more than one query.
		if(req.query.searchString.match(/:skip=/i)){
			if(req.query.searchString.toLowerCase().split(`:skip=`).length == 2){
				skipCount = parseInt(req.query.searchString.toLowerCase().split(`:skip=`)[1]);
				req.query.searchString = req.query.searchString.toLowerCase().split(`:skip=`)[0]
				if(skipCount < 0){
					skipCount = 0;						
				}
			}
		}
		// Search with specified string.
		let contextObject = {};
		if(contextArray.indexOf(`global`) == -1){
			contextObject = { locationContexts: { $in: contextArray }};
		}
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).find({ $and: [{ $or: [{ firstName: { $regex: `^${req.query.searchString}`, $options: `i` } }, { lastName: { $regex: `^${req.query.searchString}`, $options: `i` } }] }, contextObject	]}).skip(skipCount).count((err, documentCount) => {
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).find({ $and: [{ $or: [ { firstName: { $regex: `^${req.query.searchString}`, $options: `i` } }, { lastName: { $regex: `^${req.query.searchString}`, $options: `i` } }] }, contextObject ]}).skip(skipCount).limit(resultLimit).sort( { lastName: 1, firstName: 1 } ).toArray((err, documents) => {
				assert.equal(null, err);
				// Check for results.
				if(documents.length === 0){
					// No search results.
					let noMatchScreen = `<DtermIPText title='Search Results'>\n`;
						noMatchScreen += `<Text>No results found (first or last name) for the search: ${req.query.searchString}\n\nIf you feel that this is an error, please contact your system administrator.\n\nExtension Number: ${req.headers['user-agent'].split('/')[7]}\nDirectory Location Context: ${contextArray[0]}</Text>\n`;
						noMatchScreen += `<SoftKeyItem index='1' name='Back'><URI>SoftKey:Back</URI></SoftKeyItem>`;
						noMatchScreen += `</DtermIPText>`;
					res.writeHead(200, { 'Content-Type': `text/html` });
					res.end(noMatchScreen);
				} else {
					// Display search results.
					let searchResultsScreen = `<DtermIPList title='Search Results' column='1'>\n`;
						if(parseInt(skipCount) > 0){
							searchResultsScreen += `<ListItem name='...Previous Results'><URI>${serverUri}/dtd/${req.params.context}?searchString=${req.query.searchString}:skip=${skipCount - resultLimit}</URI></ListItem>`;
						}
						Object.keys(documents).forEach((key) =>{
							searchResultsScreen+= `<ListItem name='${documents[key].firstName} ${documents[key].lastName}'><URI>${serverUri}/dtd/${req.params.context}?id=${documents[key]._id}</URI></ListItem>`;
						});
						if(documentCount > resultLimit){
							searchResultsScreen += `<ListItem name='More Results...'><URI>${serverUri}/dtd/${req.params.context}?searchString=${req.query.searchString}:skip=${skipCount + resultLimit}</URI>></ListItem>`;
						}
						searchResultsScreen += `</DtermIPList>`;
					res.writeHead(200, { 'Content-Type': `text/html` });
					res.end(searchResultsScreen);
				}
			});
		});
	} else if(req.query.id){
		if(req.query.index){
		let objectID = require(`mongodb`).ObjectID(req.query.id.toString());
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).find({ _id:  objectID }).toArray((err, document) => {
			assert.equal(null, err);
			if(document[0].contactMethods[req.query.index]){
				let directoryPage = `<DtermIPDirectoryPage title="${document[0].firstName} ${document[0].lastName}" name="${document[0].contactMethods[req.query.index].contactMethodName}">\n`;
					directoryPage += `<Telephone>${document[0].contactMethods[req.query.index].contactMethodNumber}</Telephone>\n`;
					directoryPage += `<SoftKeyItem index="1" name="Dial"><URI>SoftKey:Dial</URI></SoftKeyItem>\n`;
					directoryPage += `</DtermIPDirectoryPage>`;
					res.writeHead(200, { 'Content-Type': `text/html` });
					res.end(directoryPage);
				}
			});
		} else {
			// Get document by _id and display.
			let objectID = require(`mongodb`).ObjectID(req.query.id.toString());
			mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).find({ _id:  objectID }).toArray((err, document) => {
				assert.equal(null, err);
				let individualResultScreen = `<DtermIPList title="${document[0].firstName} ${document[0].lastName}" column="1">\n`;
				if(document[0].contactMethods){
					document[0].contactMethods.forEach((contactMethod) => {
						individualResultScreen += `<ListItem name="${contactMethod.contactMethodName}"><URI param="use">${serverUri}/dtd/${req.params.context}</URI><Parameters><Param key="index" value="${document[0].contactMethods.indexOf(contactMethod)}" /><Param key="id" value="${document[0]._id}"/></Parameters></ListItem>\n`;
						});
					}
				individualResultScreen += `</DtermIPList>`;
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end(individualResultScreen);	
				});
			}	
	} else {
		// Just show the main directory menu.
		updateDtermIpAddress(req, contextArray);
		res.writeHead(200, { 'Content-Type': `text/html` });
		let directoryMainMenu = `<DtermIPList title='Corporate Directory' column='1'>\n`;
		// Browse may result in too many entries.
		directoryMainMenu += `<ListItem name='Browse Directory'><URI>${serverUri}/dtd/${req.params.context}?browse=true</URI></ListItem>`;
		directoryMainMenu += `<ListItem name='Search Directory'><URI>${serverUri}/dtd/${req.params.context}?search=true</URI></ListItem>`;
		directoryMainMenu += `<ListItem name='Support Information'><URI>${serverUri}/dtd/${req.params.context}?support=true</URI></ListItem>`;
		directoryMainMenu += `</DtermIPList>`;
		res.end(directoryMainMenu);
	}
	});
	
searchDirectoryList = (searchString, context) =>{
	if(searchString.match(/search/i)){
		// Display search screen.
		let directorySearch = `<DtermIPInput title='Search Directory'><URL>${serverUri}/dtd/${context}</URL><InputItem name='Search' itemtype='Text' key='searchString' default='' inputtype='A' maxlen='5' fieldtype='2'/>`;
			directorySearch += `<SoftKeyItem index='1' name='Back'><URI>SoftKey:Back</URI></SoftKeyItem>`;
			directorySearch += `<SoftKeyItem index='2' name='Delete'><URI>SoftKey:BackSpace</URI></SoftKeyItem>`;
			directorySearch += `</DtermIPInput>`;
		return directorySearch;
	} else {
		if(searchString.id && searchString.contactMethod === `null`){
			console.log(`Single argument. Getting user contact methods for ID: ${searchString.ID}`);
			let directoryList = `<DtermIPList title='${corporateDirectory[searchString.ID].Name}' column='1'>`;	
			if(corporateDirectory[searchString.id].Extension){
			directoryList += `<ListItem name='Extension'><URI>${serverUri}/directory-app/search/${searchString.ID}/Extension</URI></ListItem>`;
				}
			if(corporateDirectory[searchString.id].Cell){
			directoryList += `<ListItem name='Cell Phone'><URI>${serverUri}/directory-app/search/${searchString.ID}/Cell</URI></ListItem>`;
				}
			directoryList += `</DtermIPList>`;
			return directoryList;
		} else {
			let directoryPage = `<DtermIPDirectoryPage title='${searchString.contactMethod}' name='${corporateDirectory[searchString.ID].Name}'><Telephone>${corporateDirectory[searchString.ID][searchString.contactMethod]}</Telephone><Mail>${corporateDirectory[searchString.ID].Mail}</Mail><Note>${corporateDirectory[searchString.ID].Note}</Note><Department></Department><SoftKeyItem index='1' name='Dial'><URI>SoftKey:Dial</URI></SoftKeyItem></DtermIPDirectoryPage>`;
			return directoryPage;
			}
		}
} 

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
			deviceSeries: deviceInformation[response.body.match(/\d.\d.\d.\d/g)[0]].series,
			rawHeaders: req.headers,
			locationContexts: contextArray,
			lastCheckin: new Date()
		}
		if(req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)){
			document.phoneSubModel = req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)[1];
		} else {
			document.phoneSubModel = ``;
		}
		db.collection(process.env.PHONE_DATABASE_COLLECTION).updateOne({ _id: document.extension }, { $set:  document } , { upsert: true }, (err, res) => {
			assert.equal(null, err);
		});		
	});
}

module.exports = router;