const	path = require(`path`);
		require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });
const	assert = require(`assert`),
		express = require(`express`),
		mongoClient = require(`../mongo-client`),
		router = express.Router(),
		pushServer = process.env.SERVER_URI,
		got = require(`got`);

const dgram = require(`dgram`);

const server = dgram.createSocket('udp4');

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
});

server.on('listening', () => {
  var address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(5060);
// server listening 0.0.0.0:41234

// Does not close on DT730 (and probably all 700 series) phones		
router.get(`/`, (req, res) => {	
	

	mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`global-configuration`).findOne({ _id: `phone-banner-message`}, (err, mongoRes) => {
		assert.equal(null, err);
		if(mongoRes == null){
			necXML.generateTextPage(`Error`, `Page not found`, [[`Exit`, `XMLWindow:Finish`]], (textPage) => {
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end(textPage)
			});
		} else {
			necXML.generateTextPage(mongoRes.bannerTitle, mongoRes.bannerText, [[`Up`, `SoftKey:Up`],[`Down`, `SoftKey:Down`],[],[`Agree`, `XMLWindow:Finish`]], (textPage) => {
				res.writeHead(200, { 'Content-Type': `text/html` });
				res.end(textPage);
			});
			updateDtermIpAddress(req, [], (response) => {
			});
		}
	});
});

updateDtermIpAddress = (req, contextArray) => {
	if(req.headers[`user-agent`].split(`/`)[2] == `JadeDesi`){
		var hostAddress = req._remoteAddress.split(`ffff:`)[1];
	} else {
		var hostAddress = `[${req._remoteAddress}]`;
	}
	let message = Buffer.from(`SIP/2.0 200 OK
Via: SIP/2.0/UDP 10.4.0.150:53390;rport;branch=z9hG4bKPj3660cf0d77de4798a8ba8a8952edb4cf
From: <sip:10001@10.4.0.51>;tag=e4ab20aa07b343649b26ab10383dcc01
To: <sip:10001@${hostAddress}>;tag=4529baf3
Call-ID: 6a89d718457144179d7df60ca7d3c716
CSeq: 47782 REGISTER
Contact: <sip:10001@10.4.0.150:53390>;expires=0
User-Agent: Enterprise IP-PBX (InSIPH)
Expires: 0
Allow: INVITE, ACK, REGISTER, BYE, OPTIONS, INFO, CANCEL, REFER, NOTIFY, SUBSCRIBE, PRACK, UPDATE
Date: Mon, 08 Feb 2021 12:27:12 GMT
Supported: timer
Allow-Events: message-summary
Content-Length: 0`, 'utf8');
	let client = dgram.createSocket('udp4');

	client.send(message, 0, message.length, 5060, hostAddress, (err) => {
		client.close();
	});
	
	got(`http://${hostAddress}/header.cgi`).then(response => {	
		var document = {
			extension: req.headers[`user-agent`].split(`/`)[7],
			ipAddress: req._remoteAddress,
			macAddress: response.body.match(/\w\w:\w\w:\w\w:\w\w:\w\w:\w\w/)[0],
			hardwareVersion: response.body.match(/\d.\d.\d.\d/g)[0],
			firmwareVersion: response.body.match(/\d.\d.\d.\d/g)[1],
			rawHeaders: req.headers,
			locationContexts: contextArray,
			lastCheckin: new Date()
		};
		if(document.ipAddress.match(/::ffff:/)){
			document.ipAddress = document.ipAddress.replace(/::ffff:/,``);
		} 
		if(req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)){
			document.phoneSubModel = req.headers[`user-agent`].split(`/`)[2].match(/\((.*)\)/)[1];
		} else {
			document.phoneSubModel = ``;
		}		
		mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`nec-devices`).findOne( { _id: response.body.match(/\d.\d.\d.\d/g)[0] }, (err, mongoRes) => { 
			assert.equal(null, err);
			if(mongoRes == null){
				mongoRes = { series: `Error` };
			}
			document.deviceSeries = mongoRes.series;
			mongoClient.get().db(process.env.SYSTEM_VARIABLES_DATABASE).collection(`tracked-device-collection`).updateOne({ _id: document.extension }, { $set:  document } , { upsert: true }, (err, res) => {
				assert.equal(null, err);
			});	
		});				
	});
}

module.exports = router;