module.exports = {
  httpServer: true,
  httpsServer: false,
  stdinREPL: true,
  doLog: false,
  trueMongo: true,
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