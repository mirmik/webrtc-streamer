'use strict';

const createExample = require('../../lib/browser/example');

const description = 'Transcode and record audio and video into different video resolutions and then merge into single file.';

const localVideo = document.createElement('video');
localVideo.autoplay = true;
localVideo.muted = true;

async function beforeAnswer(peerConnection) {
  const localStream = await window.navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: { min: 144*2, ideal: 144*2 },
      height: { min: 176*2, ideal: 176*2 }
      //aspectRatio: { ideal: 1.7777777778 }
    },
  });

  localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream)
      console.log(track.getSettings());
  });

  localVideo.srcObject = localStream;

  // NOTE(mroberts): This is a hack so that we can get a callback when the
  // RTCPeerConnection is closed. In the future, we can subscribe to
  // "connectionstatechange" events.
  const { close } = peerConnection;
  peerConnection.close = function() {
    localVideo.srcObject = null;

    localStream.getTracks().forEach(track => track.stop());

    return close.apply(this, arguments);
  };
}

createExample('record-audio-video-stream', description, { beforeAnswer });

const videos = document.createElement('div');
videos.className = 'grid';
videos.appendChild(localVideo);
document.body.appendChild(videos);
