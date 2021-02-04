import React from 'react';

const formattedValue = (value, fractionDigit = 0) => {
  if (value) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigit,
    }).format(Math.abs(value));
  } else {
    return 0;
  }
};

const OrderbookTable = ({ data, isReversed }) => {
  let buyAmountSum = 0;

  return (
    <table>
      <thead>
        {!isReversed ? (
          <tr>
            <th>Count</th>
            <th>Amount</th>
            <th>Total</th>
            <th>Price</th>
          </tr>
        ) : (
          <tr>
            <th>Price</th>
            <th>Total</th>
            <th>Amount</th>
            <th>Count</th>
          </tr>
        )}
      </thead>
      <tbody>
        {!isReversed
          ? Object.values(data)
              .reverse()
              .map((item, index) => {
                if (item.amount > 0) {
                  buyAmountSum += item.amount;
                }

                return (
                  <tr key={index}>
                    <td> {formattedValue(item.cnt)} </td>
                    <td> {formattedValue(item.amount, 4)} </td>
                    <td> {buyAmountSum.toFixed(4)} </td>
                    <td> {formattedValue(item.price)} </td>
                  </tr>
                );
              })
          : Object.values(data).map((item, index) => {
              if (item.amount > 0) {
                buyAmountSum += item.amount;
              }

              return (
                <tr key={index}>
                  <td> {formattedValue(item.price)} </td>
                  <td> {buyAmountSum.toFixed(4)} </td>
                  <td> {formattedValue(item.amount, 4)} </td>
                  <td> {formattedValue(item.cnt)} </td>
                </tr>
              );
            })}
      </tbody>
    </table>
  );
};

export default OrderbookTable;
