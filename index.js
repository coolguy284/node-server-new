var fs = require('fs');
var http = require('http');
var https = require('https');

var common = require('./common/index');

var logger = require('./logutils').createLogger({
  name: 'main',
  logFunctions: [
    forms => console.log(forms.console),
  ],
});

var currentRequestID = 0;

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

Object.assign(global, { common, logger, promises });
Object.defineProperties(global, {
  currentRequestID: {
    configurable: true,
    enumerable: true,
    get: () => currentRequestID,
    set: val => currentRequestID = val,
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
      process.send({type: 'pong'});
      break;
  }
});


var serverFunc = require('./requests/main');

var httpServer = http.createServer(serverFunc);
httpServer.listen(common.port, () => {
  logger.info(`node-server listening on port ${common.port}`);
  promises.listen.resolve();
});


function exitHandler() {
  process.exit();
}

process.on('SIGINT', exitHandler);


/*var replServer;

promises.listen.promise.then(() => {
  replServer = require('repl').start({
    prompt: '> ',
    terminal: true,
    useColors: true,
    useGlobal: true,
    preview: true,
    breakEvalOnSigint: true,
  });

  replServer.on('exit', exitHandler);
});*/