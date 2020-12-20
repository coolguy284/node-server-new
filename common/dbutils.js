var crypto = require('crypto');

var commonFlags = require('./flags');
var common = require('./index');

var logger = require('../logutils').createLogger({ name: 'common/chatutils', doFile: true });

/*
  permission bitfield values:
  A = does not give permission but allows it
  0 - View Channel
  1 - Read Channel / Hear Voice, Watch Streams (A)
  2 - Read Other User Messages
  3 - Send Messages, Edit Own Messages, Delete Own Messages / Speak Voice, Stream to Voice
  4 - ExtraData in Messages
  5 - Add Reacts to Messages
  6 - Connect to Voice
  7 - Stream to Voice
  8 - Create Invite
  9 - Bypass Slowmode / Bypass Voice User Limit
  10 - Delete Other User Messages
  11 - Pin and Unpin Messages
  12 - Change Channel Settings
  12 - Change Channel Permissions
  13 - Create and Delete Channels, Change Channel Settings, Change Channel Permissions
  14 - Assign and Remove Roles from Users
  15 - Create Roles, Edit Role Permissions, Delete Roles, Assign and Remove Roles from Users
  16 - Manage Server, Invite Bot, Add Integration, Remove Integration
  17 - Invite Bot, Add Integration, Remove Integration
  18 - Administrator
*/

exports = module.exports = {
  /*
    uuid : object {
      version : uint8,
      timestamp : bint64,
      serverID : uint16,
      threadID : uint16,
      entityID : uint24,
      random :  uint32,
    }
  */
  parseUUID: uuid => {
    if (typeof uuid == 'string')
      uuid = Buffer.from(uuid.replace(/_/g, '/'), 'base64');
    return {
      version: uuid.readUInt8(0),
      timestamp: uuid.readBigInt64BE(1),
      serverID: uuid.readUInt16BE(9),
      threadID: uuid.readUInt16BE(11),
      entityID: uuid.readUIntBE(13, 3),
      random: uuid.readUInt32BE(16),
    };
  },

  serializeUUID: parsedObj => {
    var uuid = Buffer.alloc(16);
    uuid.writeUInt8(parsedObj.version, 0);
    uuid.writeBigInt64BE(parsedObj.timestamp, 1);
    uuid.writeUInt16BE(parsedObj.serverID, 9);
    uuid.writeUInt16BE(parsedObj.threadID, 11);
    uuid.writeUIntBE(parsedObj.entityID, 13, 3);
    uuid.writeUInt32BE(parsedObj.random, 16);
    return uuid;
  },

  stringifyUUID: parsedObj => exports.serializeUUID(parsedObj).toString('base64').replace(/\//g, '_'),

  bufToStrUUID: buf => buf.toString('base64').replace(/\//g, '_'),
  strToBufUUID: str => Buffer.from(str.replace(/_/g, '/'), 'base64'),

  createUUID: () => {
    var uuid = Buffer.alloc(16);
    var timestamp = BigInt(Date.now());

    uuid.writeUInt8(1, 0);
    uuid.writeBigInt64BE(timestamp, 1);
    uuid.writeUInt16BE(commonFlags.serverID, 9);
    uuid.writeUInt16BE(commonFlags.threadID, 11);
    if (timestamp > common.entityTimestamp)
      if (common.entityID != 0) common.entityID = 0;
    else
      common.entityID++;
    uuid.writeUIntBE(common.entityID, 13, 3);
    crypto.randomBytes(4).copy(uuid, 16);

    return uuid;
  },

  /*
    chatMsg : object {
      _id : binData (message uuid),
      version : int32,
      flags : int32 (
        bits:
          0:
            0 - anonymous
            1 - regular user
          2-1:
            00 - raw msg
            01 - markdown msg
            10 - html msg
          3:
            0 - normal
            1 - system
      ),
      authorUUID : binData (author uuid / session id for anonymous user),
      authorName : binData (for anonymous user only, null otherwise),
      content : binData,
      extraData : object {
        whatever (total size of extraData limited to 4MB)
        "file/<filename>" : binData for attached files,
        "content" : binData extended message content,
      },
      reacts : array [
        object {
          _id : binData (reaction emote uuid),
          users : array [
            binData (user uuid),
            ...
          ],
        },
        ...
      ],
    }
  */
  createChatMsg: chatMsgObj => {
    if (typeof chatMsgObj == 'string')
      chatMsgObj = {
        _id: exports.createUUID(),
        version: 1,
        flags: 0b1000,
        authorUUID: Buffer.alloc(20),
        authorName: Buffer.from('System'),
        content: chatMsgObj,
        extraData: {},
        reacts: [],
      };
    else
      chatMsgObj = {
        _id: Buffer.isBuffer(chatMsgObj._id) ? chatMsgObj._id : exports.createUUID(),
        version: Number.isSafeInteger(chatMsgObj.version) && chatMsgObj.version >= 0 && chatMsgObj.version < 256 ? chatMsgObj.version : 1,
        flags: Number.isSafeInteger(chatMsgObj.flags) && chatMsgObj.flags >= -(2 ** 31) && chatMsgObj.flags < 2 ** 31 ? chatMsgObj.flags : 0b1,
        authorUUID: Buffer.isBuffer(chatMsgObj.authorUUID) ? chatMsgObj.authorUUID : exports.createUUID(),
        authorName: typeof chatMsgObj.authorName == 'string' ? chatMsgObj.authorName : null,
        content: Buffer.isBuffer(chatMsgObj.content) ? chatMsgObj.content : typeof chatMsgObj.content == 'string' ? Buffer.from(chatMsgObj.content) : Buffer.alloc(0),
        extraData: typeof chatMsgObj.extraData == 'object' ? chatMsgObj.extraData : {},
        reacts: Array.isArray(chatMsgObj.reacts) ? chatMsgObj.reacts : [],
      };

    if (chatMsgObj.content.length > commonFlags.limits.chat.contentLength)
      throw new Error(`chat message length ${chatMsgObj.content.length}, limit ${commonFlags.limits.chat.contentLength}`);
    
    var extraDataLength = Object.keys(chatMsgObj.extraData).reduce((a, c) => a + Buffer.from(c).length + chatMsgObj.extraData[c].length);
    
    if (extraDataLength > commonFlags.limits.chat.extraDataLength)
      throw new Error(`extraData length ${extraDataLength}, limit ${commonFlags.limits.chat.extraDataLength}`);

    return chatMsgObj;
  },

  /*
    channelIndexEntry : object {
      _id : binData (channel id),
      version : int32,
      parentid : binData,
      flags : int32 (
        bits:
          3-0:
            0001 - category
            0010 - standard text channel
            0011 - standard voice channel
      ),
      name : binData,
      description : binData,
      slowMode : int32 (
        0 - no slowmode
        0+ - timeout in msecs between messages from same user
        -1 - infinite slowmode
        null if not text channel
      ),
      userLimit : int32 (
        -1 - no limit
        0+ - limit of members that can join voice
        null if not voice channel
      ),
      permissions : array [
        object {
          type : int32 (
            1 - inherit
            2 - override
          ),
          objectUUID : binData (
            object being inherited from or object to override (user / role)
          ) int32 (
            variant for special values
            1 - everyone
            2 - users
          ),
          allow : int64 (permission bitfield, null for inherit),
          deny : int64 (permission bitfield, null for inherit),
        },
        ...
      ],
    }
  */
  createChannelEntry: channelEntry => {
    if (typeof channelEntry == 'string')
      channelEntry = {
        version: null,
        puuid: null,
        uuid: null,
        name: channelEntry,
        desc: channelEntry,
      };
    else
      channelEntry = {
        version: channelEntry.version || null,
        puuid: channelEntry.puuid || null,
        uuid: channelEntry.uuid || null,
        name: channelEntry.name || null,
        desc: channelEntry.desc || null,
      };

    if (!channelEntry.version) channelEntry.version = 1;

    if (!channelEntry.puuid) channelEntry.puuid = Buffer.alloc(20);
    if (!channelEntry.uuid) channelEntry.uuid = exports.createUUID();

    if (typeof channelEntry.name == 'string')
      channelEntry.name = Buffer.from(channelEntry.name);
    
    if (!channelEntry.name) channelEntry.name = Buffer.alloc(0);

    if (typeof channelEntry.desc == 'string')
      channelEntry.desc = Buffer.from(channelEntry.desc);
    
    if (!channelEntry.desc) channelEntry.desc = Buffer.alloc(0);

    return channelEntry;
  },
};