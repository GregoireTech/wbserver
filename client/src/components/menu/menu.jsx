import React from 'react';
import './menu.css';

const menu = () => {
    return (
        <div id="menu">
        <h2 id="toggleMenu" data-translation="waiting">Menu</h2>
        <br/>

        <div id="menuItems">
          <h3 data-translation="waiting">Tools</h3>
          <ul id="tools">
            <li className="tool"><span className="tool-icon"></span><span className="tool-name" data-translation="waiting">Tool template</span></li>
          </ul>

          <h3 data-translation="waiting">Configuration</h3>
          <label htmlFor="chooseColor" data-translation="waiting">Color</label>
          {/* <input type="color" id="chooseColor" defaultValue="#1913B0" /> */}
          <br/>
          <label htmlFor="chooseSize" data-translation="waiting">Size</label>
          <input type="range" id="chooseSize" defaultValue="10" min="1" max="50" step="1" className="rangeChooser" />
          <label htmlFor="chooseOpacity" data-translation="waiting">Opacity</label>
          <input type="range" id="chooseOpacity" defaultValue="1" min="0.2" max="1" step="0.1" className="rangeChooser" />
        </div>
      </div>
    );
}

export default menu;