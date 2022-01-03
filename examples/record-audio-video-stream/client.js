'use strict';

const createExample = require('../../lib/browser/example');
const description = 'Transcode and record audio and video into different video resolutions and then merge into single file.';

const localVideo = document.createElement('video');
localVideo.autoplay = true;
localVideo.muted = true;

async function beforeAnswer(peerConnection) {
  navigator.mediaDevices.enumerateDevices().then(function(devices) {
    //var paragraph = document.getElementById("grid");
    devices.forEach(function(device) {
      console.log(device);
      var text = document.createTextNode(device.kind);
      videos.appendChild(text);
    })
  });

  const localStream = await window.navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: { min: 400, ideal: 400 },
      height: { min: 400, ideal: 400 },
      frameRate: { min: 1, ideal: 100 },
      //aspectRatio: { ideal: 1.7777777778 }
    },
  });

  //const capabilities = RTCRtpSender.getCapabilities('audio');
  localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream)
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

/*async function prestart() {
    console.log(navigator.mediaDevices)
    const devices = await navigator.mediaDevices.enumerateDevices()
    devices.map((device) => {
    console.log(device)
  });
  console.log(navigator.mediaDevices.getSupportedConstraints())
}
prestart()*/

createExample('record-audio-video-stream', description, { beforeAnswer });

const videos = document.createElement('div');
videos.className = 'grid';
videos.appendChild(localVideo);
document.body.appendChild(videos);
