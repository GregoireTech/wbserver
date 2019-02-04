import React, { Component } from 'react';
import './App.css';
import {Route} from 'react-router-dom';

import Start from './views/Start/Start';
import Room from './views/Room/Room';

class App extends Component {

  render() {

    return (
      <div className="App">
        <Route path='/' exact component={Start} />
        <Route path='/boards/' component={Room} />
      </div>
    );
  }
}

export default App;
