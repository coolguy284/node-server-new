var path = require('path');
var fs = require('fs');
var common = require('../common/index');

module.exports = function getMethod(requestProps) {
  if (requestProps.req.url == '/') {
    common.send.file(requestProps, 'websites/public/index.html');
    return;
  }
  var publicPath = path.join('websites/public', requestProps.req.url);
  if (!common.isSubDir('websites/public', publicPath)) {
    common.send.s404(requestProps);
    return;
  }
  common.send.file(requestProps, publicPath);
};