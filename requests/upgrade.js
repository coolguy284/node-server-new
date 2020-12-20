var globalVars = require('../common/globalvars');

var logger = require('../logutils').createLogger({ name: 'requests/upgr', doFile: true });

module.exports = function serverUpgradeFunc(req, socket, head) {
  try {
    var requestProps = common.getRequestProps(req, null, 'upgrade');

    logger.info(common.getReqLogStr(requestProps));
    common.globalVars.serializedReqs.push(JSON.stringify(common.serializeReqProps(requestProps)));

    if (requestProps.url.pathname == '/chat_ws') {
      globalVars.chatWSServer.handleUpgrade(req, socket, head, ws => {
        globalVars.chatWSServer.emit('connection', ws, req, requestProps);
      });
    } else {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
    }
  } catch (e) {
    logger.error(e);
  }
}