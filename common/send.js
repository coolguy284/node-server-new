var fs = require('fs');
var mime = require('mime');

var logger = require('../logutils').createLogger({ name: 'common/send', doFile: true });

module.exports = {
  fileHelper: async (requestProps, filename, head) => {
    var stats = await fs.promises.stat(filename);
    var mimeType = mime.getType(filename);
    if (requestProps.req.headers.range) {
      if (!/^bytes=[0-9]*-[0-9]*$/.test(requestProps.req.headers.range)) {
        requestProps.res.writeHead(416);
        requestProps.res.end();
      } else {
        var [ start, end ] = requestProps.req.headers.range.slice(6).split('-');
        if (!start && !end) {
          requestProps.res.writeHead(416);
          requestProps.res.end();
        } else {
          if (!start && end) {
            start = stats.size - Number(end);
            end = stats.size - 1;
          } else {
            if (!end) end = stats.size - 1;
            else end = Number(end);
            start = Number(start);
          }
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > stats.size || end < 0 || end >= stats.size) {
            requestProps.res.writeHead(416);
            requestProps.res.end();
          } else {
            requestProps.res.writeHead(head || 206, {
              'Content-Type': `${mimeType}; charset=utf-8`,
              'Content-Length': end - start + 1,
              'Content-Range': `bytes ${start}-${end}/${stats.size}`,
            });
            var readStream = fs.createReadStream(filename, { start, end });
            readStream.pipe(requestProps.res);
            readStream.on('error', logger.error);
          }
        }
        if (!end) end = stats.size - 1;
      }
    } else {
      requestProps.res.writeHead(head || 200, {
        'Content-Type': `${mimeType}; charset=utf-8`,
        'Content-Length': stats.size,
      });
      var readStream = fs.createReadStream(filename);
      readStream.pipe(requestProps.res);
      readStream.on('error', logger.error);
    }
  },
  s404: async (requestProps) => {
    await module.exports.fileHelper(requestProps, 'websites/public/page_404.html', 404);
  },
  s500: async (requestProps) => {
    await module.exports.fileHelper(requestProps, 'websites/public/page_500.html', 500);
  },
  file: async (requestProps, filename) => {
    try {
      await module.exports.fileHelper(requestProps, filename);
    } catch (err) {
      if (err.code == 'ENOENT') {
        await module.exports.s404(requestProps);
      } else {
        await module.exports.s500(requestProps);
      }
    }
  },
};