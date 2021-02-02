const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		resultLimit = 15,
		router = express.Router()
		got = require(`got`),
		necXML = require(`../nec-xml`);
		
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
	mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(process.env.STATISTICS_COLLECTION).insertOne({ timeStamp: date, reqHeaders: req.headers, urlAccessed: `DTerm Directory` }, (err, res) => {
		assert.equal(null, err);
	});
	if(req.query.hasOwnProperty(`support`) && req.query.support.match(/true/i)){
		necXML.generateTextPage(`Support Information`, `Extension Number: ${req.headers['user-agent'].split('/')[7]}\nIP Address: ${req._remoteAddress}\nLocation Contexts: ${contextArray.join(', ')}\n`, [[`Back`, `SoftKey:Back`]], (textPage) => {
			res.writeHead(200, { 'Content-Type': `text/html` });
			res.end(textPage);
		});
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
					necXML.generateTextPage(`Search Results`, `No directory results available.\n\nIf you feel that this is an error, please contact your system administrator.\n\nExtension Number: ${req.headers['user-agent'].split('/')[7]}\nDirectory Location Context: ${contextArray[0]}`, [[`Back`, `SoftKey:Back`]], (textPage) => {
						res.writeHead(200, { 'Content-Type': `text/html` });
						res.end(textPage);
					});
				} else {					
					let itemArray = [];
					assert.equal(null, err);			
						if(parseInt(req.query.skip) > 0){
							itemArray.push([`...Previous Results`,`${serverUri}/dtd/${req.params.context}?skip=${req.query.skip - resultLimit}`]);
						}
					documents.forEach((document) =>{
						itemArray.push([`${document.firstName} ${document.lastName}`,`${serverUri}/dtd/${req.params.context}?id=${document._id}`]);
					});
					if(documentCount > resultLimit){
						itemArray.push([`More Results...`,`${serverUri}/dtd/${req.params.context}?skip=${parseInt(req.query.skip) + resultLimit}`]);
					}
					necXML.generateDtermIPList(`Browse`,itemArray,[[`Back`, `SoftKey:Back`]], (dtermIPList) => {
						res.writeHead(200, { 'Content-Type': `text/html` });
						res.end(dtermIPList);
					});	
				}
			});
		});
	} else if(req.query.hasOwnProperty(`search`) && req.query.search.match(/true/i)) {
		// Display the search screen.
		necXML.generateDtermIPInput(`Search Directory`, `${serverUri}/dtd/${req.params.context}`, `Search`, `Text`, `searchString`, `5`, [[`Back`,`SoftKey:Back`],[`Delete`,`SoftKey:BackSpace`]], (dtermIPInput) => {
			res.writeHead(200, { 'Content-Type': `text/html` });
			res.end(dtermIPInput);
		});	
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
					necXML.generateTextPage(`Search Results`, `No results found (first or last name) for the search: ${req.query.searchString}\n\nIf you feel that this is an error, please contact your system administrator.\n\nExtension Number: ${req.headers['user-agent'].split('/')[7]}\nDirectory Location Context: ${contextArray[0]}`, [[`Back`, `SoftKey:Back`]], (textPage) => {
						res.writeHead(200, { 'Content-Type': `text/html` });
						res.end(textPage);
					});					
				} else {		
					// Display search results.
					let itemArray = [];
						if(parseInt(skipCount) > 0){
							itemArray.push([`...Previous Results`,`${serverUri}/dtd/${req.params.context}?searchString=${req.query.searchString}:skip=${skipCount - resultLimit}`]);
						}
						Object.keys(documents).forEach((key) =>{
							itemArray.push([`${documents[key].firstName} ${documents[key].lastName}`,`${serverUri}/dtd/${req.params.context}?id=${documents[key]._id}`]);
						});
						if(documentCount > resultLimit){
							itemArray.push([`More Results...`,`${serverUri}/dtd/${req.params.context}?searchString=${req.query.searchString}:skip=${skipCount + resultLimit}`]);
						}
					necXML.generateDtermIPList(`Search Results`,itemArray,[[`Back`, `SoftKey:Back`]], (dtermIPList) =>{
						res.writeHead(200, { 'Content-Type': `text/html` });
						res.end(dtermIPList);
					});
				}
			});
		});
	} else if(req.query.id){
		if(req.query.index){
		let objectID = require(`mongodb`).ObjectID(req.query.id.toString());
		
		mongoClient.get().db(process.env.DIRECTORY_DATABASE).collection(process.env.DIRECTORY_COLLECTION).find({ _id:  objectID }).toArray((err, document) => {
			assert.equal(null, err);
			if(document[0].contactMethods[req.query.index]){
				res.writeHead(200, { 'Content-Type': `text/html` });
				necXML.generateDirectoryPage(`${document[0].firstName} ${document[0].lastName}`, document[0].contactMethods[req.query.index].contactMethodName, document[0].contactMethods[req.query.index].contactMethodNumber, [[`Back`,`SoftKey:Back`],[],[],[`Dial`,`SoftKey:Dial`]], (directoryPage) => {
					res.end(directoryPage);
				});				
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
		
		let directoryMainMenu = `<DtermIPList title='' column='1'>\n`;
		necXML.generateDtermIPList(`Corporate Directory`,[[`Browse Directory`,`${serverUri}/dtd/${req.params.context}?browse=true`],[`Search Directory`,`${serverUri}/dtd/${req.params.context}?search=true`],[`Support Information`,`${serverUri}/dtd/${req.params.context}?support=true`]],[[`Back`, `SoftKey:Back`]], (dtermIPList) =>{
			res.writeHead(200, { 'Content-Type': `text/html` });
			res.end(dtermIPList);
		});	
		
	}
});

module.exports = router;