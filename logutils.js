var util = require('util');

var consoleFormats = {
  info: {
    name: '[$(timestamp)] [$(name)] $(type): $(value)',
    noname: '[$(timestamp)] $(type): $(value)',
  },
  warn: {
    name: '[$(timestamp)] [$(name)] \x1b[33m$(type): $(value)\x1b[0m',
    noname: '[$(timestamp)] \x1b[33m$(type): $(value)\x1b[0m',
  },
  error: {
    name: '[$(timestamp)] [$(name)] \x1b[31m$(type): $(value)\x1b[0m',
    noname: '[$(timestamp)] \x1b[31m$(type): $(value)\x1b[0m',
  },
};

function consoleCall(type, args, opts) {
  var timestamp = new Date().toISOString();
  var formattedString = util.formatWithOptions({
    showHidden: true,
    colors: true,
    showProxy: true,
  }, ...args);
  
  let forms = Object.create(Object.prototype, {
    console: {
      configurable: true,
      enumerable: true,
      get: () => {
        var finalString;
        if (type in consoleFormats) {
          if (opts.nam) {
            finalString = consoleFormats[type].name
              .replace('$(timestamp)', timestamp)
              .replace('$(name)', opts.nam)
              .replace('$(type)', type)
              .replace('$(value)', formattedString);
          } else {
            finalString = consoleFormats[type].noname
              .replace('$(timestamp)', timestamp)
              .replace('$(type)', type)
              .replace('$(value)', formattedString);
          }
        }
        return finalString;
      }
    },

    json: {
      configurable: true,
      enumerable: true,
      get: () => JSON.stringify({
        timestamp: timestamp,
        name: opts.name,
        value: formattedString,
      }),
    }
  });

  opts.logFunctions.forEach(func => func(forms));
}

function createLogger(opts) {
  var consoleObject = new console.Console({
    stdout: process.stdout,
    stderr: process.stderr,
  });
  var consoleFuncs = {
    info: consoleObject.info,
    warn: consoleObject.warn,
    error: consoleObject.error,
  };
  consoleObject.info = (...args) => consoleCall('info', args, opts);
  consoleObject.warn = (...args) => consoleCall('warn', args, opts);
  consoleObject.error = (...args) => consoleCall('error', args, opts);
  return consoleObject;
}

module.exports = {
  consoleFormats,
  consoleCall,
  createLogger,
};