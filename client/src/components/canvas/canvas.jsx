import React from 'react';

import './canvas.css';

const canvas = (props) => {
    return (
        <canvas id="imageView" width={props.width} height={props.height}>
            <p>Unfortunately, your browser is currently unsupported by our web
                application. We are sorry for the inconvenience. Please use one of the
                supported browsers listed below, or draw the image you want using an
                offline tool.
            </p>
                <p>Supported browsers:
                <a href="http://www.opera.com">Opera</a>,
                <a href="http://www.mozilla.com">Firefox</a>,
                <a href="http://www.apple.com/safari">Safari</a>, and
                <a href="http://www.konqueror.org">Konqueror</a>.
            </p>
        </canvas>
    );
};

export default canvas;