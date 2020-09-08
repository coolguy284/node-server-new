var fs = require('fs');
var mime = require('mime');

var logger = require('../logutils').createLogger({
  name: 'common/send',
  logFunctions: [
    forms => console.log(forms.console)
  ],
});

module.exports = {
  s404: requestProps => {
    requestProps.res.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
    var readStream = fs.createReadStream('websites/public/page_404.html');
    readStream.pipe(requestProps.res);
    readStream.on('error', logger.error);
  },
  s500: requestProps => {
    requestProps.res.writeHead(500, {'Content-Type': 'text/html; charset=utf-8'});
    var readStream = fs.createReadStream('websites/public/page_500.html');
    readStream.pipe(requestProps.res);
    readStream.on('error', logger.error);
  },
  file: (requestProps, filename) => {
    fs.open(filename, (err, fd) => {
      if (err) {
        if (err.code == 'ENOENT') {
          module.exports.s404(requestProps);
        } else {
          module.exports.s500(requestProps);
        }
        return;
      }
      var mimeType = mime.getType(filename);
      requestProps.res.writeHead(200, {'Content-Type': `${mimeType}; charset=utf-8`});
      var readStream = fs.createReadStream(null, { fd });
      readStream.pipe(requestProps.res);
      readStream.on('error', logger.error);
    });
  },
};