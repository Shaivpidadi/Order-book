import React, { useState, useEffect, useMemo } from 'react';
import { Accordion, Card, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretUp, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import _ from 'lodash';
import moment from 'moment';
import CRC from 'crc-32';

import OrderbookTable from '../OrderbookTable/OrderbookTable';
import './Orderbook.css';

const precision = ['P0', 'P1', 'P2', 'P3', 'P4'];
const OrderBook = () => {
  const [toggleIcon, setToggleIcon] = useState(true);
  const [orderData, setOrderData] = useState({ bids: [], asks: [] });
  const [precisionIndex, setPrecisionIndex] = useState(0);
  const [toggleWebsocket, setToggleWebsocket] = useState(false);
  const [bookData, setBookData] = useState({});

  // This Will be Dynamic
  const currencyPair = 'btcusd';
  const currencyArray = currencyPair.toUpperCase().match(/.{1,3}/g);

  useEffect(() => {
    const BOOK = {};
    let seq = null;

    const ws = new WebSocket('wss://api-pub.bitfinex.com/ws/2');
    if (toggleWebsocket) {
      ws.close();
    }
    ws.onmessage = (msg) => {
      msg = JSON.parse(msg?.data);

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

        console.log('Not Found');
        if (cs_calc !== checksum) {
          console.error('CHECKSUM_FAILED');
          return;
        }
        return;
      }
      if (BOOK.mcnt === 0) {
        _.each(msg[1], function (pp) {
          pp = { price: pp[0], cnt: pp[1], amount: pp[2] };
          const side = pp.amount >= 0 ? 'bids' : 'asks';
          pp.amount = Math.abs(pp.amount);
          if (BOOK[side][pp.price]) {
            console.log('Not Found');
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
            console.log('Not Found');
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
      // if (Object.values(BOOK.bids).length === 25 && Object.values(BOOK.asks).length === 25) {
      setBookData({ ...bookData, ...BOOK });
      // }
    };

    ws.onopen = () => {
      BOOK.bids = {};
      BOOK.asks = {};
      BOOK.psnap = {};
      BOOK.mcnt = 0;
      ws.send(JSON.stringify({ event: 'conf', flags: 65536 + 131072 }));

      ws.send(
        JSON.stringify({
          event: 'subscribe',
          channel: 'book',
          symbol: 'tBTCUSD',
          prec: precision[precisionIndex],
          freq: 'F1',
          len: 25,
        }),
      );
    };

    ws.onclose = () => {
      ws.close();
      seq = null;
      console.log({ BOOK });
    };

    return () => {
      seq = null;
      ws.close();
    };
  }, [currencyPair, precisionIndex, toggleWebsocket]);

  const onIncreasePrecisionClick = (e) => {
    e.stopPropagation();
    if (precisionIndex === precision.length - 1) {
      return;
    } else {
      setPrecisionIndex(precisionIndex + 1);
    }
  };

  const onDecreasePrecisionClick = (e) => {
    e.stopPropagation();
    if (precisionIndex === 0) {
      return;
    } else {
      setPrecisionIndex(precisionIndex - 1);
    }
  };

  const onStopWebsocketClick = (e) => {
    e.stopPropagation();
    setToggleWebsocket(!toggleWebsocket);
  };

  const chartData = useMemo(() => {
    function processData(list, type, desc) {
      // Convert to data points
      for (let i = 0; i < list.length; i++) {
        list[i] = {
          value: Number(list[i][0]),
          volume: Math.abs(Number(list[i][2] * list[i][0])),
        };
      }

      // Sort list just in case
      list.sort(function (a, b) {
        if (a.value > b.value) {
          return 1;
        } else if (a.value < b.value) {
          return -1;
        } else {
          return 0;
        }
      });

      // Calculate cummulative volume
      if (desc) {
        for (let i = list.length - 1; i >= 0; i--) {
          if (i < list.length - 1) {
            list[i].totalvolume = list[i + 1].totalvolume + list[i].volume;
          } else {
            list[i].totalvolume = list[i].volume;
          }
          let dp = {};
          dp['value'] = list[i].value;
          dp[type + 'volume'] = list[i].volume;
          dp[type + 'totalvolume'] = list[i].totalvolume;
          res.unshift(dp);
        }
      } else {
        for (let i = 0; i < list.length; i++) {
          if (i > 0) {
            list[i].totalvolume = list[i - 1].totalvolume + list[i].volume;
          } else {
            list[i].totalvolume = list[i].volume;
          }
          let dp = {};
          dp['value'] = list[i].value;
          dp[type + 'volume'] = list[i].volume;
          dp[type + 'totalvolume'] = list[i].totalvolume;
          res.push(dp);
        }
      }
    }
    // Init
    let res = [];
    let bids = [...orderData.bids];
    let asks = [...orderData.asks];
    processData(bids, 'bids', true);
    processData(asks, 'asks', false);

    return res;
  }, [orderData]);

  function cumulativeTotal(obj, isAsk) {
    let array;
    console.log({ obj });
    if (Object.keys(obj).length > 0) {
      if (isAsk) {
        // array = _.map(Object.values(obj.bids), 'amount');
        array = Object.values(obj.bids).filter(({ amount }) => amount);
      } else {
        array = Object.values(obj.asks).filter(({ amount }) => amount);
      }

      console.log('array', array, array.length);

      if (array.length < 25) {
        console.log('Bids', Object.values(obj.bids).length);
        console.log('Asks', Object.values(obj.asks).length);
      }

      let sumData = [];
      array.forEach((element) => {
        sumData.push(parseFloat(element));
      });

      let result = [sumData[0]];

      for (let i = 1; i < array.length; i++) {
        result[i] = result[i - 1] + sumData[i];
      }

      // return result;
      console.log({ result });
      return result;
    } else {
      console.log('In else');
    }
  }

  // This should be in different Component
  useEffect(() => {
    setTimeout(() => {
      let chart = am4core.create('chartdiv', am4charts.XYChart);
      // Add data
      chart.data = chartData;

      // Set up precision for numbers
      chart.numberFormatter.numberFormat = '#,###.##';

      // Create axes
      let xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
      xAxis.dataFields.category = 'value';
      xAxis.renderer.labels.template.disabled = true;

      let yAxis = chart.yAxes.push(new am4charts.ValueAxis());
      yAxis.renderer.labels.template.disabled = true;

      // Create series
      let series = chart.series.push(new am4charts.StepLineSeries());
      series.dataFields.categoryX = 'value';
      series.dataFields.valueY = 'bidstotalvolume';
      series.strokeWidth = 1;
      series.stroke = am4core.color('#0f0');
      series.fill = series.stroke;
      series.fillOpacity = 1;

      let series2 = chart.series.push(new am4charts.StepLineSeries());
      series2.dataFields.categoryX = 'value';
      series2.dataFields.valueY = 'askstotalvolume';
      series2.strokeWidth = 1;
      series2.stroke = am4core.color('#f00');
      series2.fill = series2.stroke;
      series2.fillOpacity = 1;
      chart.current = chart;

      return () => {
        chart.dispose();
      };
    }, 1000);
  }, [chartData]);

  return (
    <Accordion defaultActiveKey='0'>
      <Card className='card-background'>
        <Card.Header>
          <Accordion.Toggle
            as={Button}
            variant='link'
            eventKey='0'
            style={{ width: '100%' }}
            onClick={() => setToggleIcon(!toggleIcon)}
          >
            <div className='d-flex justify-content-between'>
              <div>
                <FontAwesomeIcon icon={!toggleIcon ? faCaretUp : faCaretDown} />
              </div>
              <div>
                <button onClick={(e) => onStopWebsocketClick(e)}>Toggle Websocket</button>
              </div>
              <div>
                <FontAwesomeIcon
                  className='ml-4'
                  icon={faMinus}
                  onClick={(e) => onDecreasePrecisionClick(e)}
                />

                <FontAwesomeIcon
                  className='ml-4'
                  icon={faPlus}
                  onClick={(e) => onIncreasePrecisionClick(e)}
                />
              </div>
            </div>
          </Accordion.Toggle>
        </Card.Header>
        <Accordion.Collapse eventKey='0'>
          <Card.Body>
            <div className='order-container' style={{ backgroundColor: 'transparent' }}>
              <OrderbookTable data={bookData?.bids || {}} />
              <OrderbookTable data={bookData?.asks || {}} isReversed />
            </div>
            {/* <div
              id='chartdiv'
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: '0%',
                paddingTop: '30px',
                opacity: 0.3,
                zIndex: -3,
              }}
            ></div> */}
          </Card.Body>
        </Accordion.Collapse>
      </Card>
    </Accordion>
  );
};

export default OrderBook;
