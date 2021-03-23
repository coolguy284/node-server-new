module.exports = {
  httpServer: true,
  httpsServer: true,
  stdinREPL: true,
  doLog: false,
  trueMongo: false,
  serverID: 1,
  threadID: 1,
  limits: {
    chat: {
      contentLength: 4096,
      extraDataLength: 2 ** 22,
      channelNameLength: 128,
      channelDescLength: 4096,
    }
  }
};