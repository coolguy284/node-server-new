var fs = require('fs');
var http = require('http');
var https = require('https');
var ws = require('ws');
var BSON = require('bson');
var CryptoJS = require('./libs/crypto-js.min.js');

var common = require('./common/index');

var logger = require('./logutils').createLogger({ name: 'main', doFile: true });

if (common.flags.trueMongo) {
  logger.info(`loading mongodb`);
  var mongodb = require('mongodb');
} else {
  logger.info(`loading mongodb-dummy`);
  var mongodb = require('./common/mongodb-dummy');
}


function externResolvePromise() {
  var obj = {};

  obj.promise = new Promise((resolve, reject) => {
    obj.resolve = () => {
      obj.resolvedTimestamp = Date.now();
      resolve(obj.resolvedTimestamp);
    };
    obj.reject = err => {
      obj.rejectedTimestamp = Date.now();
      reject(err);
    };
  });

  return obj;
}

var promises = {
  listen: externResolvePromise(),
};

Object.assign(global, { BSON, CryptoJS, common, logger, promises });
Object.defineProperties(global, {
  currentRequestID: {
    configurable: true,
    enumerable: true,
    get: () => common.currentRequestID,
    set: val => common.currentRequestID = val,
  },
});

// used to respond to pings from manager.js
process.on('message', msg => {
  if (typeof msg != 'object') {
    logger.error(`bad IPC message`);
    return;
  }
  switch (msg.type) {
    case 'ping':
      process.send({ type: 'pong' });
      break;
  }
});

common.globalVars.mongoClient = new mongodb.MongoClient(`mongodb://${encodeURIComponent(process.env.MONGODB_USER)}:${encodeURIComponent(process.env.MONGODB_PASS)}@coolguy284.com?tls=true`, {
  tlsCAFile: `${__dirname}/ca.pem`,
  useUnifiedTopology: true,
});

common.globalVars.mongoClient.connect(err => {
  if (err) return logger.error(err);
  logger.info(`connected to mongodb`);

  var client = common.globalVars.mongoClient;
  common.globalVars.mongoChatChannels = client.db('chatChannels');
  common.globalVars.mongoChatChanIndex = client.db('chatChanIndex');
  common.globalVars.mongoChatChanIndexReg0 = common.globalVars.mongoChatChanIndex.collection('region0');
});

common.globalVars.serverFunc = require('./requests/main');
common.globalVars.serverUpgradeFunc = require('./requests/upgrade');

if (common.flags.httpServer) {
  common.globalVars.httpServer = http.createServer(common.globalVars.serverFunc);
  common.globalVars.httpServer.on('upgrade', common.globalVars.serverUpgradeFunc);
}
if (common.flags.httpsServer) {
  common.globalVars.httpsServer = https.createServer(common.globalVars.serverFunc);
  common.globalVars.httpsServer.on('upgrade', common.globalVars.serverUpgradeFunc);
}

common.globalVars.chatWSFunc = require('./requests/chatws');

common.globalVars.chatWSServer = new ws.Server({ noServer: true });
common.globalVars.chatWSServer.on('connection', common.globalVars.chatWSFunc);

if (common.flags.httpServer) {
  common.globalVars.httpServer.listen(common.port, () => {
    logger.info(`node-server (http) listening on port ${common.port}`);
    promises.listen.resolve();
  });
}
if (common.flags.httpsServer) {
  common.globalVars.httpServer.listen(common.portTLS, () => {
    logger.info(`node-server (https) listening on port ${common.portTLS}`);
    promises.listen.resolve();
  });
}

Object.assign(global, { httpServer: common.globalVars.httpServer, chatWSServer: common.globalVars.chatWSServer });

function exitHandler() {
  common.globalVars.mongoClient.close();
  process.exit();
}

// common.chatutils.createChannel(null,{name:'Public 1'});exitHandler();

process.on('SIGINT', exitHandler);

if (common.flags.stdinREPL) {
  promises.listen.promise.then(() => {
    common.globalVars.replServer = require('repl').start({
      prompt: '',
      terminal: true,
      useColors: true,
      useGlobal: true,
      preview: true,
      breakEvalOnSigint: true,
    });

    common.globalVars.replServer.on('exit', exitHandler);
  });
}