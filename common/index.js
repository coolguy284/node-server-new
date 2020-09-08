var path = require('path');

module.exports = {
  port: process.env.PORT || 8080,
  flags: {
    doLog: false,
  },
  formatIP: ip => {
    if (typeof ip != 'string') return '';
    if (/^::ffff:[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ip)) {
      return '::ffff:' + ip.slice(7, Infinity).split('.').map(x => x.padStart('-', 3)).join('.');
    }
  },
  isSubDir: (parent, dir) => {
    var relativePath = path.relative(parent, dir);
    return relativePath && relativePath != '..' && !relativePath.startsWith('../');
  },
  send: require('./send'),
};