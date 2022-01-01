'use strict';

const { PassThrough } = require('stream')
const fs = require('fs')
const gstreamer = require("gstreamer-superficial");

const { RTCAudioSink, RTCVideoSink } = require('wrtc').nonstandard;

let UID = 0;
const pipeline = new gstreamer.Pipeline("videotestsrc is-live=true ! video/x-raw,format=UYVY ! ndisinkcombiner name=combiner ! ndisink ndi-name='My NDI source' audiotestsrc is-live=true ! combiner.audio");
pipeline.play()

function beforeOffer(peerConnection) {
  const audioTransceiver = peerConnection.addTransceiver('audio');
  const videoTransceiver = peerConnection.addTransceiver('video');
  
  const audioSink = new RTCAudioSink(audioTransceiver.receiver.track);
  const videoSink = new RTCVideoSink(videoTransceiver.receiver.track);

  const streams = [];

  videoSink.addEventListener('frame', ({ frame: { width, height, data }}) => {
    const size = width + 'x' + height;
    if (!streams[0] || (streams[0] && streams[0].size !== size)) {
      UID++;

      const stream = {
        recordPath: './recording-' + size + '-' + UID + '.mp4',
        size,
        video: new PassThrough(),
        audio: new PassThrough()
      };

      const onAudioData = ({ samples: { buffer } }) => {
        if (!stream.end) {
          //stream.audio.push(Buffer.from(buffer));
        }
      };

      audioSink.addEventListener('data', onAudioData);

      stream.audio.on('end', () => {
        audioSink.removeEventListener('data', onAudioData);
      });

      streams.unshift(stream);

      streams.forEach(item=>{
        if (item !== stream && !item.end) {
          item.end = true;
          if (item.audio) {
            item.audio.end();
          }
          item.video.end();
        }
      })
    }

    //streams[0].video.push(Buffer.from(data));
  });

  const { close } = peerConnection;
  peerConnection.close = function() {
    audioSink.stop();
    videoSink.stop();

    streams.forEach(({ audio, video, end, proc, recordPath })=>{
      if (!end) {
        if (audio) {
          audio.end();
        }
        video.end();
      }
    });

    return close.apply(this, arguments);
  }
}

module.exports = { beforeOffer };
