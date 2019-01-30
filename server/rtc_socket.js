
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