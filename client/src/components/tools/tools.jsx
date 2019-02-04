import React from 'react';

import './tools.css';

const tools = (props) => {

    const toolList = [
        {
        id: 'Pencil',
        name:'pencil'
    },
        {
        id: 'Rectangle',
        name:'rect'
    },
    //     {
    //     id: 'circle-button',
    //     name:'circle'
    // },
    //     {
    //     id: 'ellipse-button',
    //     name:'ellipse'
    // },
        {
        id: 'Straight line',
        name:'line'
    },
        {
        id: 'Text',
        name:'text'
    },
        {
        id: 'Eraser',
        name:'erase'
    }
    // ,
    //     {
    //     id: 'Zoom',
    //     name:'zoom'
    // }
    // // ,
    //     {
    //     id: 'Hand',
    //     name:'drag'
    // }
    
]

    let tools = toolList.map(tool => {
        let toolUrl = require(`../../assets/icons/tools/${tool.name}.svg`); 
        return (
            <img key={tool.name} src={toolUrl} alt={tool.name} id={tool.id}/>
        );
    });

    return(
        <div className="toolsContainer">
            {tools}
            <span className="form-group" >
            Colour :
            <br/>
            <input 
                id='chooseColor'
                type='color'
                defaultValue='#345678' 
            /> 

            </span>
            <label htmlFor="chooseSize" data-translation="waiting">Size</label>
            <input type="range" id="chooseSize" defaultValue="10" min="1" max="50" step="1" className="rangeChooser" />
            <label htmlFor="chooseOpacity" data-translation="waiting">Opacity</label>
            <input type="range" id="chooseOpacity" defaultValue="1" min="0.2" max="1" step="0.1" className="rangeChooser" />

        </div> 
    );
};

export default tools;