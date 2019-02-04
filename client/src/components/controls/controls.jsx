import React from 'react';
import './controls.css'



const controls = (props) => {
    const controlsList = [
        { 
            link : 'invite',
            name: 'Inviter',
            click: props.openModal
        },
        { 
            link : 'download',
            name: 'Télécharger'
        },
        { 
            link : 'file',
            name: 'Fichier'
        },
        { 
            link : 'info',
            name: 'Aide'
        },
        { 
            link : 'microphone',
            name: 'Micro On'
        },
        { 
            link : 'camera',
            name: 'Vidéo On'
        },
    ];

    let controlItems = controlsList.map((control) => {
        let imgUrl=require(`../../assets/icons/controls/${control.link}.svg`);
        if (control.click) {
            return(
                <li onClick={control.click} key={control.link} className='control' id={control.link} >
                    <img src={imgUrl} alt={control.link}/>
                    <span className='toolText'>{control.name}</span>
                </li>
            );        
        } else {
            return(
                <li key={control.link} className='control' id={control.link} >
                    <img src={imgUrl} alt={control.link}/>
                    <span className='toolText'>{control.name}</span>
                </li>
            );    
        }
    });

    return(
        <div className="controlsContainer">
            <ul id='controls'>
                {controlItems}
            </ul>
            <video autoPlay id="remoteVideo"></video>
            <video autoPlay muted id="localVideo"></video>
        </div>
    );
};

export default controls;