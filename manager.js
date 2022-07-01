// this script starts index.js and sends IPC messages every second, if no message is recieved within 5 seconds the process is restarted, and if the process is restarted 3 times in succession with no recieved messages, this process shuts down

var fs = require('fs');
var cp = require('child_process');

var baseLogFileName = `logs/${new Date().toISOString().replace(/:|\./g, '-')}`;

var logger = require('./logutils').createLogger({ name: 'manager', doFile: true });

var missedAcks = 0;
var restartCount = 0;

var proc = null;

var serverManageFunc = () => {
  if (!proc) {
    // runs if node-server was freshly restarted or just starting up
    logger.info(`starting node-server`);

    proc = cp.spawn('node', ['index.js', baseLogFileName], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    process.stdin.pipe(proc.stdin);
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);

    proc.on('message', msg => {
      if (typeof msg != 'object') {
        logger.error(`bad IPC message`);
        return;
      }
      switch (msg.type) {
        case 'pong':
          missedAcks = 0;
          break;
      }
    });

    proc.on('exit', (code, signal) => {
      logger.info(`node-server exited with code ${code}, signal [${signal}]`);

      if (code == 0 || code == null && signal == 'SIGINT') {
        process.exit();
      } else {
        proc = null;
        restartCount++;
        if (restartCount >= 3) {
          logger.error(`node-server exited too much, terminating`);
          process.exit();
        }
      }
    });
  } else {
    // runs when node-server is running
    if (missedAcks >= 5) {
      logger.error(`node-server missed 5 acks, assuming process is locked up and restarting it`);
      process.kill(proc.pid);
    }
    missedAcks++;
    proc.send({ type: 'ping' });
  }
};
serverManageFunc();
setInterval(serverManageFunc, 60000);

// perform a shutdown if Ctrl+C is pressed
process.on('SIGINT', () => {
  logger.info(`Ctrl+C pressed, manager and server shutting down`);
  if (proc) {
    process.kill(proc.pid, 'SIGINT');
  }
});