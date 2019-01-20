const iolib = require('socket.io');
let rooms = require('./data/rooms.json');

// Start the socket server
function startIO(app) {
    io = iolib(app);
    io.on('connection', onConnection);
    return io;
};



function onConnection(socket) {

    console.log('user connected');

    // ON DISCONNECT
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });



    // THE WEBRTC FUNCTIONALITIES
    /* ALICE message type */
    socket.on('ASK_WEB_RTC', function (msg) {
        console.log('ASK_WEB_RTC: ' + msg);
        io.emit('ASK_WEB_RTC', msg);
    });

    socket.on('CANDIDATE_WEB_RTC_ALICE', function (msg) {
        console.log('CANDIDATE_WEB_RTC_ALICE: ' + msg);
        io.emit('CANDIDATE_WEB_RTC_ALICE', msg);
    });

    /* BOB message type */
    socket.on('CANDIDATE_WEB_RTC_BOB', function (msg) {
        console.log('CANDIDATE_WEB_RTC_BOB: ' + msg);
        io.emit('CANDIDATE_WEB_RTC_BOB', msg);
    });

    socket.on('RESPONSE_WEB_RTC', function (msg) {
        console.log('RESPONSE_WEB_RTC: ' + msg);
        io.emit('RESPONSE_WEB_RTC', msg);
    });


    // THE WHITEBOARD FUNCTIONALITIES
    socket.on('drawing', function (data) {
        socket.broadcast.emit('drawing', data);
        console.log(data);
    });

    socket.on('rectangle', function (data) {
        socket.broadcast.emit('rectangle', data);
        console.log(data);
    });

    socket.on('linedraw', function (data) {
        socket.broadcast.emit('linedraw', data);
        console.log(data);
    });

    socket.on('circledraw', function (data) {
        socket.broadcast.emit('circledraw', data);
        console.log(data);
    });

    socket.on('ellipsedraw', function (data) {
        socket.broadcast.emit('ellipsedraw', data);
        console.log(data);
    });

    socket.on('textdraw', function (data) {
        socket.broadcast.emit('textdraw', data);
        console.log(data);
    });

    socket.on('copyCanvas', function (data) {
        socket.broadcast.emit('copyCanvas', data);
        console.log(data);
    });

    socket.on('Clearboard', function (data) {
        socket.broadcast.emit('Clearboard', data);
        console.log(data);
    });

};


exports.start = startIO;