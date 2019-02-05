const express = require('express');
const app = express();
const server = require('http').Server(app);
const sockets = require('./socket');
const port = process.env.PORT || 8888;





const io = sockets.start(server);


server.listen(port, () => console.log('listening on port ' + port));