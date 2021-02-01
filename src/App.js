import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

import './assets/css/style.css';
// import App.css';

import Login from './views/Login/Login';

const App = () => {
  return (
    <React.Suspense fallback={<Login />}>
      <BrowserRouter>
        <Switch>
          <Route path='/' component={React.lazy(() => import('./views/Dashboard/Dashboard'))} />
        </Switch>
      </BrowserRouter>
    </React.Suspense>
  );
};

export default App;
