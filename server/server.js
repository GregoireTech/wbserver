const express = require('express');
const app = express();
const server = require('http').Server(app);
const sockets = require('./socket');
const port = process.env.PORT || 8880;


if (process.env.NODE_ENV === 'production') {
    // Express will serve up production assets
    app.use(express.static('client/build'));
    // Express will serve up the index.html file
    const path = require('path');
    app.get('/boards', (req, res) => {
        console.log('in boards');
    });
    app.get('/', (req, res) => {
        res.sendFile(path.resolve(__dirname,'client', 'build', 'index.html'));
    });

}


const io = sockets.start(server);


server.listen(port, () => console.log('listening on port ' + port));