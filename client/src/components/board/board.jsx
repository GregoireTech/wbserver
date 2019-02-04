import React from 'react';
import './board.css';

const board = (props) => {

    return(
            <div id="board">
                <svg id="canvas" width={props.width} height={props.height} version="1.1" xmlns="http://www.w3.org/2000/svg">
                    <defs id="defs"></defs>
                </svg>
            </div>
    );

}

export default board;
