var path = require('path');
var fs = require('fs');
var common = require('../common/index');

module.exports = async function headMethod(requestProps) {
  requestProps.res.writeHead(204);
  requestProps.res.end();
};