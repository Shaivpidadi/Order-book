import React, { useState, useEffect, useMemo } from 'react';
import { Accordion, Card, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretUp, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';

import OrderbookTable from '../OrderbookTable/OrderbookTable';
import './Orderbook.css';

const precision = ['P0', 'P1', 'P2', 'P3', 'P4'];
const OrderBook = () => {
  const [toggleIcon, setToggleIcon] = useState(true);
  const [orders, setOrders] = useState([]);
  const [orderData, setOrderData] = useState({ bids: [], asks: [] });
  const [precisionIndex, setPrecisionIndex] = useState(0);
  const [toggleWebsocket, setToggleWebsocket] = useState(false);

  // This Will be Dynamic
  const currencyPair = 'btcusd';
  const currencyArray = currencyPair.toUpperCase().match(/.{1,3}/g);

  useEffect(() => {
    const ws = new WebSocket('wss://api.bitfinex.com/ws/2');
    if (toggleWebsocket) {
      ws.close();
    }
    ws.onmessage = (msg) => {
      const response = JSON.parse(msg?.data);
      if (response[1] === 'hb') {
        return;
      }
      setOrders(response[1]);
    };

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          event: 'subscribe',
          channel: 'book',
          symbol: 'tBTCUSD',
          prec: precision[precisionIndex],
          len: 25,
        }),
      );
    };

    ws.onclose = () => {
      ws.close();
    };

    return () => {
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

  useEffect(() => {
    if (!!orders && orders?.length > 0) {
      if (orders?.length === 50) {
        setOrderData({
          ...orderData,
          bids: orders.slice(0, 24),
          asks: orders.slice(-24),
        });
      } else if (orderData.bids.length > 0 && orderData.asks.length > 0) {
        if (orders[2] > 0) {
          const allBids = new Array(orderData.bids.reverse());
          const allAsks = new Array(orderData.asks.reverse());
          let bids = allBids;
          if (bids[0]?.length >= 25) {
            bids[0].shift();
          }
          setOrderData({ asks: [...allAsks[0]], bids: [orders, ...bids[0]] });
        } else {
          const allBids = new Array(orderData.bids.reverse());
          const allAsks = new Array(orderData.asks.reverse());
          let asks = allAsks;
          if (asks[0]?.length >= 25) {
            asks[0].shift();
          }
          setOrderData({ asks: [orders, ...asks[0]], bids: [...allBids[0]] });
        }
      }
    }
  }, [orders]);

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

  function cumulativeTotal(array) {
    let sumData = [];
    array.forEach((element) => {
      sumData.push(element[2]);
    });

    let result = [sumData[0]];

    for (let i = 1; i < array.length; i++) {
      result[i] = result[i - 1] + sumData[i];
    }

    // return result;
    return result;
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
              <OrderbookTable
                tradingTo={currencyArray[0]}
                tradingFrom={currencyArray[1]}
                data={orderData?.bids || []}
                total={cumulativeTotal(orderData?.bids || [])}
              />
              <OrderbookTable
                tradingTo={currencyArray[0]}
                tradingFrom={currencyArray[1]}
                data={orderData?.asks || []}
                total={cumulativeTotal(orderData?.asks || [])}
              />
            </div>
            <div
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
            ></div>
          </Card.Body>
        </Accordion.Collapse>
      </Card>
    </Accordion>
  );
};

export default OrderBook;
