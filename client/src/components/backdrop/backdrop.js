import React from 'react';

import './backdrop.css';




const backdrop = (props) => {

    const backdropComponent = (
        <div className='backdrop' onClick={props.click}>
        </div>
    );
    return(
        props.show? backdropComponent : null
    );
}

export default backdrop;