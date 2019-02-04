import adapter from 'webrtc-adapter';

const webRTC = (socket, boardReady, servers) => {
    console.log(servers.iceServers);
    // Setup video containers
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    // Setup local variables
    let initiator = boardReady
    let localMediaStream = false;
    let localConn = {};
    let remoteTempIceCandidates = [];
    let gotRemoteDesc = false;
    let gotStream = false;
    let gotLocalDescription = false;
    const ICE_config = {
        'iceServers': [{
                'url': 'stun:stun.l.google.com:19302'
            },
            {
                'url': 'turn:192.158.29.39:3478?transport=udp',
                'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                'username': '28224511:1379330808'
            },
            {
                'url': 'turn:192.158.29.39:3478?transport=tcp',
                'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                'username': '28224511:1379330808'
            }
        ]
    }

    // Try to get local stream 
    const tryVideoChat = () => {
        console.log('trying video');
        window.navigator.getUserMedia({
            audio: true,
            video: true
        }, function (localStream) {
            localMediaStream = localStream;
            localVideo.srcObject = localStream;
            initVideoChat();
        }, function (err) {
            console.error("You are not allow navigator use device", err);
        });
    }

    const initVideoChat = () => {
        //Setup RTC connnection, add local stream and listen for remote stream
        const setupConnection = () => {
            console.log('setting up connection');
            localConn = new RTCPeerConnection(ICE_config);
            localConn.addStream(localMediaStream);
            localConn.addEventListener('track', gotRemoteStream);
            localConn.onicecandidate = handleLocalIceCandidate;
        };

        // Starts connection, create & send offer
        const handleVideoInit = () => {
            console.log('peer ready');
            localConn.createOffer(function (desc) {
                // desc is typeof RTCSessionDescription wich contains local's session
                if (!gotLocalDescription) {
                    localConn.setLocalDescription(desc);
                    gotLocalDescription = true;
                    console.log('send desc');
                    socket.emit('OFFER_WEB_RTC', JSON.stringify(desc));
                }
                // send desc to remote
            }, function (err) {
                console.error(err);
            });
        }

        // Add offer to local connection, create & send answer
        const handleOffer = (remoteDesc) => {
            if (!gotRemoteDesc) {
                console.log('handling offer');
                let remoteTempDesc = JSON.parse(remoteDesc);
                // add remote's description
                localConn.setRemoteDescription(
                        new RTCSessionDescription(remoteTempDesc)
                    )
                    .then(() => {
                        gotRemoteDesc = true;
                        // registerIceCandidates();
                        localConn.createAnswer(function (localDesc) {
                            //if (!gotLocalDescription) {
                            localConn.setLocalDescription(localDesc);
                            gotLocalDescription = true;
                            //}
                            //registerRemoteIceCandidates();
                            socket.emit('RESPONSE_WEB_RTC', localDesc);

                        }, function (err) {
                            console.log(err);
                        });
                    })
                    .catch(err => console.log(err));
            }
        }

        // When we receive remote stream, display it in remote video
        const gotRemoteStream = evt => {
            console.log('got remote stream');
            //if (!gotStream) {
            if (remoteVideo.srcObject !== evt.streams[0]) {
                remoteVideo.srcObject = evt.streams[0];

            }
            //}
        };

        // Sort ice candidate & send them to remote peer
        const handleLocalIceCandidate = evt => {
            console.log('handling local candidate');
            if (evt.candidate) {

                // send ice local's iceCandidate to remote
                console.log('send ice candidate')
                socket.emit('CANDIDATE_WEB_RTC', {
                    candidate: evt.candidate
                });
            }
        }

        // Receives remote ICE candidate to remote candidates array
        const handleRemoteIceCandidate = data => {
            console.log('handling remote candidate');
            if (data.candidate) {
                //if (gotRemoteDesc) {
                localConn.addIceCandidate(
                        new RTCIceCandidate(data.candidate)
                    )
                    .then(() => {
                        console.log('AddIceCandidate success!');
                    })
                    .catch(err => {
                        console.error('Error AddIceCandidate');
                        console.error(err);
                    })
                // } else {
                //     remoteTempIceCandidates.push(data.candidate);
                //}
            }
        }

        // const registerIceCandidates = remoteTempIceCandidates => {
        //     for (let i = 0; i < remoteTempIceCandidates.length; i++){
        //         localConn.addIceCandidate(
        //             new RTCIceCandidate(remoteTempIceCandidates[i])
        //         )
        //         .then(() => {
        //             console.log('AddIceCandidate success!');
        //         })
        //         .catch(err => {
        //             console.error('Error AddIceCandidate');
        //             console.error(err);
        //         })
        //     }
        // }

        // First we setup our own connection
        setupConnection();
        //Signal the other peer that we are ready
        if (initiator) setTimeout(socket.emit('RTC_PEER_READY'), 5000);
        // Setup the list of events we expect to receive
        socket.on('RTC_PEER_READY', handleVideoInit);

        socket.on('CANDIDATE_WEB_RTC', handleRemoteIceCandidate);

        socket.on('OFFER_WEB_RTC', handleOffer);

        socket.on('RESPONSE_WEB_RTC', remoteDesc => {
            console.log('got response');
            if (!gotRemoteDesc) {
                localConn.setRemoteDescription(new RTCSessionDescription(remoteDesc));
                gotRemoteDesc = true;
                //registerIceCandidates();
            }
        });

    }
    // Re-initialize if peer disconnects
    socket.on('PEER_DISCONNECTED', () => {
        console.log("peer disconnected");
        initiator = false;
        gotRemoteDesc = false;
        gotStream = false;
        gotLocalDescription = false;
        remoteVideo.srcObject = null;
        if (localConn !== {}) localConn.close();
        localConn = {};
        remoteTempIceCandidates = [];
        if (localMediaStream !== false) {
            initVideoChat();
        } else {
            tryVideoChat();
        }

    });

    // First we setup our own connection & video stream
    tryVideoChat();




};

export default webRTC;