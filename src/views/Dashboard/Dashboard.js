import React from 'react';

import OrderBook from '../../components/Orderbook/Orderbook';
import Ticker from '../../components/Ticker/Ticker';
import './Dashboard.css';

const Dashboard = () => (
  <div className=''>
    <div className='row d-flex flex-row align-content-md-center w-100 p-4'>
      <div className='col-md-5'>
        <Ticker />
      </div>
      <div className='col-md-7'>
        <OrderBook />
      </div>
    </div>
  </div>
);

export default Dashboard;
