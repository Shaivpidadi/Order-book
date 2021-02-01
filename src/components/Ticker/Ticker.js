import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons';

import './Ticker.css';

const formattedValue = (value) => {
  if (value) {
    return new Intl.NumberFormat('en-US').format(value);
  } else {
    return 0;
  }
};

const Ticker = () => {
  const [tickerData, setTickerData] = useState();
  useEffect(() => {
    const ws = new WebSocket('wss://api.bitfinex.com/ws/2');
    ws.onmessage = (msg) => {
      const response = JSON.parse(msg?.data);

      if (response[1] === 'hb') {
        return;
      }
      setTickerData(response[1]);
    };

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          event: 'subscribe',
          channel: 'ticker',
          symbol: 'tBTCUSD',
        }),
      );
    };

    ws.onclose = () => {
      ws.close();
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className='row ticker-container'>
      <div className='col-2'>
        <img
          className='ticker-logo'
          alt='ticker-logo'
          src='https://static.bitfinex.com/images/icons/BTC-alt.svg'
        />
      </div>
      <div className='col-5' style={{ color: 'white' }}>
        <div>BTC/USD</div>
        <div>
          <span className='show-light'>VOL </span>
          <span>{!!tickerData ? formattedValue(tickerData[7]) : 0}</span>
          <span className='show-light'> BTC</span>
        </div>
        <div>
          <span className='show-light'>LOW </span>
          <span>{!!tickerData ? formattedValue(tickerData[9]) : 0}</span>
        </div>
      </div>
      <div className='col-5 d-flex ticker-right'>
        <div>{!!tickerData ? formattedValue(tickerData[6]) : 0}</div>
        <div
          className={!!tickerData ? (tickerData[4] > 0 ? 'positive-green' : 'negative-red') : ''}
        >
          <span>{!!tickerData ? tickerData[4].toFixed(2) : 0}</span>
          <span>
            <FontAwesomeIcon
              className='ml-1 mr-1'
              icon={!!tickerData ? (tickerData[4] > 0 ? faCaretUp : faCaretDown) : faCaretUp}
            />
          </span>
          <span>({!!tickerData ? Number(tickerData[5] * 100).toFixed(2) : 0})</span>
        </div>
        <div>
          <span className='show-light'>HIGH </span>
          <span>{!!tickerData ? formattedValue(tickerData[8]) : 0}</span>
        </div>
      </div>
    </div>
  );
};

export default Ticker;
