var globalVars = require('./globalvars');

module.exports = {
  createChannel: (id, obj) => {
    if (!id) id = common.bufutils.bufToStrUUID(common.bufutils.createUUID());
    if (!obj) obj = {};
    else obj = { ...obj };
    globalVars.chat[id] = obj.chat || [];
    if (obj.chat) delete obj.chat;
    globalVars.chatExtra[id] = Object.assign({
      typing: [],
    }, common.bufutils.createChannelEntry(obj));
  },
};