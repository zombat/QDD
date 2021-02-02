const	assert = require(`assert`),
		mongoClient = require(`./mongo-client`);
		
module.exports = {	

	processDialString: (dialString, callback) => {
		mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `outside-number-prefix` },(err, res) => {
			assert.equal(null, err);
			if(res == null || res.addPrefix == false){
				callback(dialString);
			} else {
				switch(res.dialRules) {
				  case `US`:
					if((dialString.length == 7 || dialString.length == 11 ) && !dialString.match(/$1/)){
						dialString = res.outsideAccessCode + dialString;
					} else if(dialString.length == 10 && !dialString.match(/$1/)){
						dialString = res.outsideAccessCode + res.countryCode + dialString;
					}
					break;
				  default:
				}
				callback(dialString);
			}
		});
	}
	
}