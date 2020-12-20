var path = require('path');
var fs = require('fs');
var common = require('../common/index');

module.exports = async function getMethod(requestProps) {
  if (requestProps.url.pathname == '/') {
    await common.send.file(requestProps, 'websites/public/index.html');
    return;
  }
  var publicPath = path.join('websites/public', requestProps.url.pathname);
  if (!common.isSubDir('websites/public', publicPath)) {
    await common.send.s404(requestProps);
    return;
  }
  await common.send.file(requestProps, publicPath);
};