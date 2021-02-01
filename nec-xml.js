const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
		
module.exports = {
	
	padChar: (myString, myLength, padChar) => {
		while(myString.length < myLength){
			myString = padChar + myString ;
		}
		return(myString);
	},
	
	generateTextPage: (messageTitle, messageText, buttonArray) => {
		let textPage  = `<DtermIPText title="${messageTitle}">`;
			textPage += `<Text>${messageText}</Text>`;
			textPage += module.exports.generateButtonArray(buttonArray);
			textPage += `</DtermIPText>`;
			return(textPage);
	},
	
	generateDtermIPList: (listTitle, listItemArray, buttonArray) => {
		let dtermIPList = `<DtermIPList title="${listTitle}" column='1'>\n`;
			for(let i=0; i<listItemArray.length; i++){
				if(listItemArray[i].length){
					dtermIPList += `<ListItem name="${listItemArray[i][0]}"><URI>${listItemArray[i][1]}</URI></ListItem>`;
				}
			}
		dtermIPList += module.exports.generateButtonArray(buttonArray);
		return(dtermIPList);
	},
	
	generateDirectoryPage: (diretoryTitle, contactMethodName, contactMethodNumber, buttonArray) => {
		if(process.env.PREFIX_OUTSIDE_NUMBERS == `true`){
			if((contactMethodNumber.length == 7 || contactMethodNumber.length == 11 ) && !contactMethodNumber.match(/$1/)){
				contactMethodNumber = process.env.OUTSIDE_PREFIX + contactMethodNumber;
			} else if(contactMethodNumber.length == 10 && !contactMethodNumber.match(/$1/)){
				contactMethodNumber = process.env.OUTSIDE_PREFIX + process.env.NATIONAL_PREFIX + contactMethodNumber;
			}
		}
		let directoryPage  = `<DtermIPDirectoryPage title="${diretoryTitle}" name="${contactMethodName}">`;
			directoryPage += `<Telephone>${contactMethodNumber}</Telephone>`;
			directoryPage += module.exports.generateButtonArray(buttonArray);
			directoryPage += `</DtermIPDirectoryPage>`;
		return(directoryPage);
	},
	
	generateDtermIPInput: (inputTitle, searchURI, itemName, itemType, itemKey, maxLength, buttonArray) => {
		let dtermIPInput  = `<DtermIPInput title="${inputTitle}"><URL>${searchURI}</URL><InputItem name="${itemName}" itemtype="${itemType}" key='${itemKey}' default='' inputtype='A' maxlen='${maxLength}' fieldtype='2'/>`;
			dtermIPInput += module.exports.generateButtonArray(buttonArray);
			dtermIPInput += `</DtermIPInput>`;
		return(dtermIPInput);
	},
	
	generateButtonArray: (buttonArray) => {
		let createdButtons = ``;
		for(let i=0; i<buttonArray.length; i++){
			if(buttonArray[i].length){
				console.log(buttonArray[i].length);
				createdButtons += `<SoftKeyItem index='${i+1}' name='${buttonArray[i][0]}'><URI>${buttonArray[i][1]}</URI></SoftKeyItem>`;
			}
		}
		return(createdButtons);
	}
}