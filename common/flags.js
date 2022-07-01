module.exports = {
  httpServer: process.env.HTTP ? process.env.HTTP == 'true' : true,
  httpsServer: process.env.HTTPS ? process.env.HTTPS == 'true' : true,
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