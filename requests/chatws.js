var common = require('../common');

var logger = require('../logutils').createLogger({ name: 'requests/chatws', doFile: true });

module.exports = function chatWSFunc(ws, req, requestProps) {
  var conn = common.globalVars.chatConns[sessionIDStr] = {
    ws, req, requestProps,
    sessionID: common.dbutils.createUUID(),
    sessionIDStr: null,
    channel: null,
  };

  conn.sessionIDStr = common.dbutils.bufToStrUUID(sessionID);

  ws.on('message', msg => {
    try {
      try {
        msg = JSON.parse(msg.toString());
      } catch (e) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'INVAL_WSMSG_JSON',
          description: 'invalid wsmessage JSON',
        }));
        return;
      }
      switch (msg.type) {
        case 'auth':
          break;
        case 'set_focus':
          if (msg.channel == null) {
            if (
              conn.channel &&
              common.globalVars.chatChannelConns[conn.channel] &&
              Object.keys(common.globalVars.chatChannelConns[conn.channel]).length == 1
            ) delete common.globalVars.chatChannelConns[conn.channel];
            else delete common.globalVars.chatChannelConns[conn.channel][conn.sessionIDStr];
            conn.channel = null;
          } else if (typeof msg.channel == 'string') {
            var channelBuf = common.dbutils.strToBufUUID(msg.channel);
            var channelObj = common.globalVars.mongoChatChanIndexReg0.findOne({ _id: channelBuf });
            if (channelObj) {
              if (
                conn.channel &&
                common.globalVars.chatChannelConns[conn.channel] &&
                Object.keys(common.globalVars.chatChannelConns[conn.channel]).length == 1
              ) delete common.globalVars.chatChannelConns[conn.channel];
              else delete common.globalVars.chatChannelConns[conn.channel][conn.sessionIDStr];
              conn.channel = msg.channel;
              if (
                !common.globalVars.chatChannelConns[conn.channel]
              ) common.globalVars.chatChannelConns[conn.channel] = { ws };
              ws.send(JSON.stringify({
                type: 'set_focus_ack',
                channel: msg.channel,
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                code: 'NO_CHANNEL',
                description: 'channel not found',
                channel: msg.channel,
              }));
            }
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'NO_CHANNEL',
              description: 'channel not found',
              channel: msg.channel,
            }));
          }
          break;
        default:
          ws.send(JSON.stringify({
            type: 'error',
            code: 'INVAL_WSMSG_TYPE',
            description: 'invalid wsmessage type',
          }));
          break;
      }
    } catch (err) {
      logger.error(err);
      try {
        ws.send(JSON.stringify({
          type: 'error',
        }));
      } catch (err2) {
        logger.error(err2);
      }
    }
  });

  ws.on('close', () => delete common.globalVars.chatConns[sessionIDStr]);
};