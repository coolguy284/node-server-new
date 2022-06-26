var path = require('path');

module.exports = {
  port: process.env.PORT || 8080,
  portTLS: process.env.PORTTLS || 8443,

  flags: require('./flags'),

  currentRequestID: 0,

  entityID: 0,
  entityTimestamp: 0n,

  globalVars: require('./globalvars'),

  formatIP: ip => {
    if (typeof ip != 'string') return '';
    if (/^::ffff:[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ip)) {
      return '::ffff:' + ip.slice(7, Infinity).split('.').map(x => x.padStart('-', 3)).join('.');
    }
  },

  isSubDir: (parent, dir) => {
    var relativePath = path.relative(parent, dir);
    return relativePath && relativePath != '..' && !relativePath.startsWith('..' + path.sep) && !path.isAbsolute(relativePath);
  },

  getRequestProps: (req, res, type) => {
    var requestProps = {
      type,
      req, res,
      ip: req.socket.remoteAddress,
      proto: req.socket.encrypted ? 'https' : 'http',
      host: null,
      urlString: null,
      url: null,
      timestamp: new Date(),
    };

    if ('host' in req.headers) {
      if (/[a-z0-9-]+/.test(req.headers.host))
        requestProps.host = req.headers.host;
      else
        requestProps.host = 'INVALID';
    } else {
      requestProps.host = 'NULL';
    }

    requestProps.urlString = req.url.replace(/[@:]+/g, '');

    if (!requestProps.urlString.startsWith('/'))
      requestProps.urlString = '/' + requestProps.urlString;

    requestProps.url = new URL(`${requestProps.proto == 'http' ? 'http' : 'https'}://${requestProps.host}${requestProps.urlString}`);

    return requestProps;
  },

  getReqLogStr: requestProps =>
    `${module.exports.currentRequestID.toString().padStart(5, '0')} ${module.exports.formatIP(requestProps.ip)} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.req.method} ${requestProps.req.url}`,

  serializeReqProps: requestProps => {
    var req = requestProps.req;
    return {
      id: module.exports.currentRequestID,
      timestamp: requestProps.timestamp.toISOString(),
      httpVersion: req.httpVersion,
      method: req.method,
      url: req.url,
      fullUrl: requestProps.url.href,
      proto: requestProps.proto,
      headers: req.headers,
      rawHeaders: req.rawHeaders,
      socket: {
        remoteFamily: req.socket.remoteFamily,
        localAddress: req.socket.localAddress,
        localPort: req.socket.localPort,
        remoteAddress: req.socket.remoteAddress,
        remotePort: req.socket.remotePort,
      },
    };
  },

  send: require('./send'),

  dbutils: require('./dbutils'),
  chatutils: require('./chatutils'),
};