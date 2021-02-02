import React from 'react';

const formattedValue = (value) => {
  if (value) {
    return new Intl.NumberFormat('en-US').format(Math.abs(value));
  } else {
    return 0;
  }
};

const OrderbookTable = ({ data, tradingTo, tradingFrom, total }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Count</th>
          <th>Amount ({tradingTo})</th>
          <th>Total</th>
          <th>Price ({tradingFrom})</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            <td> {formattedValue(item[1])} </td>
            <td> {formattedValue(item[2])} </td>
            <td> {Math.abs(parseFloat(total[index]).toFixed(3))} </td>
            <td> {formattedValue(item[0])} </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default OrderbookTable;
