const	dialRules = require(`./dial-rules`);

module.exports = {
	padChar: (myString, myLength, padChar) => {
		while(myString.length < myLength){
			myString = padChar + myString ;
		}
		callback(myString);
	},

	generateTextPage: (messageTitle, messageText, buttonArray, callback) => {
		let textPage  = `<DtermIPText title="${messageTitle}">`;
			textPage += `<Text>${messageText}</Text>`;
			textPage += module.exports.generateButtonArray(buttonArray);
			textPage += `</DtermIPText>`;
		callback(textPage);
	},

	generateDtermIPList: (listTitle, listItemArray, buttonArray, callback) => {
		let dtermIPList = `<DtermIPList title="${listTitle}" column="1">\n`;
			for(let i=0; i<listItemArray.length; i++){
				if(listItemArray[i].length){
					dtermIPList += `<ListItem name="${listItemArray[i][0]}"><URI>${listItemArray[i][1]}</URI></ListItem>`;
				}
			}
		dtermIPList += module.exports.generateButtonArray(buttonArray);
		callback(dtermIPList);
	},

	generateDirectoryPage: (diretoryTitle, contactMethodName, contactMethodNumber, buttonArray, callback) => {
		dialRules.processDialString(contactMethodNumber, (dialNumber) => {
			let directoryPage  = `<DtermIPDirectoryPage title="${diretoryTitle}" name="${contactMethodName}">`;
				directoryPage += `<Telephone>${dialNumber}</Telephone>`;
				directoryPage += module.exports.generateButtonArray(buttonArray);
				directoryPage += `</DtermIPDirectoryPage>`;
			callback(directoryPage);
		});
	},

	generateDtermIPInput: (inputTitle, searchURI, itemName, itemType, itemKey, maxLength, buttonArray, callback) => {
		let dtermIPInput  = `<DtermIPInput title="${inputTitle}"><URL>${searchURI}</URL><InputItem name="${itemName}" itemtype="${itemType}" key="${itemKey}" default="" inputtype="A" maxlen="${maxLength}" fieldtype="2"/>`;
			dtermIPInput += module.exports.generateButtonArray(buttonArray);
			dtermIPInput += `</DtermIPInput>`;
		callback(dtermIPInput);
	},

	generateButtonArray: (buttonArray) => {
		let createdButtons = ``;
		for(let i=0; i<buttonArray.length; i++){
			if(buttonArray[i].length){
				createdButtons += `<SoftKeyItem index="${i+1}" name="${buttonArray[i][0]}"><URI>${buttonArray[i][1]}</URI></SoftKeyItem>`;
			}
		}
		return(createdButtons);
	}
}
