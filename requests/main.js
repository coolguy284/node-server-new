var fs = require('fs');

var common = require('../common/index');
var getMethod = require('./get');

var logger = require('../logutils').createLogger({
  name: 'requests/main',
  logFunctions: [
    forms => console.log(forms.console),
  ],
});

module.exports = function serverFunc(req, res) {
  try {
    var requestProps = {
      req, res,
      ip: req.socket.remoteAddress,
      proto: req.socket.encrypted ? 'https' : 'http',
    };
    logger.info(`${currentRequestID.toString().padStart(5, '0')} ${common.formatIP(requestProps.ip)} ${requestProps.proto.padEnd(5, ' ')} ${req.method} ${req.url}`);
    if (req.method == 'GET') {
      getMethod(requestProps);
    } else {
      res.writeHead(501);
      res.end();
    }
    currentRequestID++;
  } catch (err) {
    logger.error(err);
    try {
      common.send.s500(requestProps);
    } catch (err2) {
      logger.error(err2);
    }
  }
};