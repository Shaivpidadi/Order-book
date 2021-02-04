/*USAGE:
npm install ws lodash async moment crc-32
mkdir logs
node bfx_test_book.js BTCUSD
*/

const WS = require('ws');
const _ = require('lodash');
const async = require('async');
const fs = require('fs');
const moment = require('moment');
const CRC = require('crc-32');

const pair = process.argv[2];

const conf = {
  wshost: 'wss://api.bitfinex.com/ws/2',
};

const logfile = __dirname + '/logs/ws-book-aggr.log';

const BOOK = {};

console.log(pair, conf.wshost);

let connected = false;
let connecting = false;
let cli;
let seq = null;

function connect() {
  if (connecting || connected) return;
  connecting = true;

  cli = new WS(conf.wshost, {
    /* rejectUnauthorized: false */
  });

  cli.on('open', function open() {
    console.log('WS open');
    connecting = false;
    connected = true;
    BOOK.bids = {};
    BOOK.asks = {};
    BOOK.psnap = {};
    BOOK.mcnt = 0;
    cli.send(JSON.stringify({ event: 'conf', flags: 65536 + 131072 }));
    cli.send(
      JSON.stringify({ event: 'subscribe', channel: 'book', pair: pair, prec: 'P0', len: 100 }),
    );
  });

  cli.on('close', function open() {
    seq = null;
    console.log('WS close');
    connecting = false;
    connected = false;
  });

  cli.on('message', function (msg) {
    msg = JSON.parse(msg);

    if (msg.event) return;
    if (msg[1] === 'hb') {
      seq = +msg[2];
      return;
    } else if (msg[1] === 'cs') {
      seq = +msg[3];

      const checksum = msg[2];
      const csdata = [];
      const bids_keys = BOOK.psnap['bids'];
      const asks_keys = BOOK.psnap['asks'];

      for (let i = 0; i < 25; i++) {
        if (bids_keys[i]) {
          const price = bids_keys[i];
          const pp = BOOK.bids[price];
          csdata.push(pp.price, pp.amount);
        }
        if (asks_keys[i]) {
          const price = asks_keys[i];
          const pp = BOOK.asks[price];
          csdata.push(pp.price, -pp.amount);
        }
      }

      const cs_str = csdata.join(':');
      const cs_calc = CRC.str(cs_str);

      fs.appendFileSync(
        logfile,
        '[' +
          moment().format('YYYY-MM-DDTHH:mm:ss.SSS') +
          '] ' +
          pair +
          ' | ' +
          JSON.stringify([
            'cs_string=' + cs_str,
            'cs_calc=' + cs_calc,
            'server_checksum=' + checksum,
          ]) +
          '\n',
      );
      if (cs_calc !== checksum) {
        console.error('CHECKSUM_FAILED');
        process.exit(-1);
      }
      return;
    }

    fs.appendFileSync(
      logfile,
      '[' +
        moment().format('YYYY-MM-DDTHH:mm:ss.SSS') +
        '] ' +
        pair +
        ' | ' +
        JSON.stringify(msg) +
        '\n',
    );

    if (BOOK.mcnt === 0) {
      _.each(msg[1], function (pp) {
        pp = { price: pp[0], cnt: pp[1], amount: pp[2] };
        const side = pp.amount >= 0 ? 'bids' : 'asks';
        pp.amount = Math.abs(pp.amount);
        if (BOOK[side][pp.price]) {
          fs.appendFileSync(
            logfile,
            '[' +
              moment().format() +
              '] ' +
              pair +
              ' | ' +
              JSON.stringify(pp) +
              ' BOOK snap existing bid override\n',
          );
        }
        BOOK[side][pp.price] = pp;
      });
    } else {
      const cseq = +msg[2];
      msg = msg[1];

      if (!seq) {
        seq = cseq - 1;
      }

      if (cseq - seq !== 1) {
        console.error('OUT OF SEQUENCE', seq, cseq);
        process.exit();
      }

      seq = cseq;

      let pp = { price: msg[0], cnt: msg[1], amount: msg[2] };

      if (!pp.cnt) {
        let found = true;

        if (pp.amount > 0) {
          if (BOOK['bids'][pp.price]) {
            delete BOOK['bids'][pp.price];
          } else {
            found = false;
          }
        } else if (pp.amount < 0) {
          if (BOOK['asks'][pp.price]) {
            delete BOOK['asks'][pp.price];
          } else {
            found = false;
          }
        }

        if (!found) {
          fs.appendFileSync(
            logfile,
            '[' +
              moment().format() +
              '] ' +
              pair +
              ' | ' +
              JSON.stringify(pp) +
              ' BOOK delete fail side not found\n',
          );
        }
      } else {
        let side = pp.amount >= 0 ? 'bids' : 'asks';
        pp.amount = Math.abs(pp.amount);
        BOOK[side][pp.price] = pp;
      }
    }

    _.each(['bids', 'asks'], function (side) {
      let sbook = BOOK[side];
      let bprices = Object.keys(sbook);

      let prices = bprices.sort(function (a, b) {
        if (side === 'bids') {
          return +a >= +b ? -1 : 1;
        } else {
          return +a <= +b ? -1 : 1;
        }
      });

      BOOK.psnap[side] = prices;
    });

    BOOK.mcnt++;
    checkCross(msg);
  });
}

setInterval(function () {
  if (connected) return;
  connect();
}, 3500);

function checkCross(msg) {
  let bid = BOOK.psnap.bids[0];
  let ask = BOOK.psnap.asks[0];
  if (bid >= ask) {
    let lm = [moment.utc().format(), 'bid(' + bid + ')>=ask(' + ask + ')'];
    fs.appendFileSync(logfile, lm.join('/') + '\n');
    console.log(lm.join('/'));
  }
}

function saveBook() {
  const now = moment.utc().format('YYYYMMDDHHmmss');
  fs.writeFileSync(
    __dirname + '/logs/tmp-ws-book-aggr-' + pair + '-' + now + '.log',
    JSON.stringify({ bids: BOOK.bids, asks: BOOK.asks }),
  );
}

setInterval(function () {
  saveBook();
}, 30000);
