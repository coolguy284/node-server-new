var fs = require('fs');

var common = require('../common/index');
var getMethod = require('./get');
var headMethod = require('./head');
var postMethod = require('./post');
var optionsMethod = require('./options');

var logger = require('../logutils').createLogger({ name: 'requests/main', doFile: true });

module.exports = async function serverFunc(req, res) {
  try {
    var requestProps = common.getRequestProps(req, res, 'main');

    logger.info(common.getReqLogStr(requestProps));
    common.globalVars.serializedReqs.push(JSON.stringify(common.serializeReqProps(requestProps)));
    if (common.globalVars.serializedReqs.length > common.flags.limits.serializedReqs)
      common.globalVars.serializedReqs.splice(0, common.globalVars.serializedReqs.length - common.flags.limits.serializedReqs);

    switch (req.method.toUpperCase()) {
      case 'GET': await getMethod(requestProps); break;
      case 'HEAD': await headMethod(requestProps); break;
      case 'POST': await postMethod(requestProps); break;
      case 'OPTIONS': await optionsMethod(requestProps); break;
      default: res.writeHead(501); res.end(); break;
    }
    common.currentRequestID++;
  } catch (err) {
    logger.error(err);
    try {
      await common.send.s500(requestProps);
    } catch (err2) {
      logger.error(err2);
    }
  }
};