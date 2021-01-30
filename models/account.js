const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });    
let		mongoose = require(`mongoose`),
		Schema = mongoose.Schema,
		passportLocalMongoose = require(`passport-local-mongoose`);

const Account = new Schema({
	username: {
		type: String,
		required: true,
		index: {
			unique: true
		}
	},
    password: String,
    lockUntil: {
		type: Number
	},
	previousCode: {
		type: String,
		required: false
	},
	secret_key: { 
		secret: String,
		authenticated: { 
            type: Boolean,
            default: false
        }
    },
    tfa:{
        type: Boolean,
        default: false
    }
});

Account.statics.failedLogin = {
    NOT_FOUND: 0,
    PASSWORD_INCORRECT: 1,
    MAX_ATTEMPTS: 2
};

Account.plugin(passportLocalMongoose, {
	limitAttempts: true,
	maxAttempts: 5
});

module.exports = mongoose.model(`Account`, Account);