function upgrade() {
    upgradeButton.disabled = true;
    navigator.mediaDevices
        .getUserMedia({
            video: true
        })
        .then(stream => {
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
                console.log(`Using video device: ${videoTracks[0].label}`);
            }
            localStream.addTrack(videoTracks[0]);
            localVideo.srcObject = null;
            localVideo.srcObject = localStream;
            pc1.addTrack(videoTracks[0], localStream);
            return pc1.createOffer();
        })
        .then(offer => pc1.setLocalDescription(offer))
        .then(() => pc2.setRemoteDescription(pc1.localDescription))
        .then(() => pc2.createAnswer())
        .then(answer => pc2.setLocalDescription(answer))
        .then(() => pc1.setRemoteDescription(pc2.localDescription));
}