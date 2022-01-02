'use strict';

var a = 0
var appsrc = null
const { PassThrough } = require('stream')
const fs = require('fs')
const gstreamer = require("gstreamer-superficial");

const { RTCAudioSink, RTCVideoSink } = require('wrtc').nonstandard;

let UID = 0;
var inited = false
//const pipeline2 = new gstreamer.Pipeline("appsrc name=mysource is-live=true ! videoconvert ! autovideosink");

function startStream(width, height) {
  const pipeline = new gstreamer.Pipeline(
    "appsrc name=mysource is-live=true ! " +
    `video/x-raw,format=I420,width=${width},height=${height},framerate=1000/1 ! ` +
    "rawvideoparse use-sink-caps=true !  " +
    //`videoconvert ! videoscale ! ` +
    //`video/x-raw,format=I420,width=${width*2},height=${height*2},framerate=1000/1 ! ` +
    " videoconvert ! " +
    "ndisinkcombiner name=combiner ! ndisink ndi-name='My NDI source' " 
    //"autovideosink sync=false"
    //+
    //"audiotestsrc is-live=true ! audioconvert ! combiner.audio"
  );

  pipeline.pollBus(msg => {
    console.log(msg);
  });

    appsrc = pipeline.findChild('mysource')
    pipeline.play()
  }

function beforeOffer(peerConnection) {
  const audioTransceiver = peerConnection.addTransceiver('audio');
  const videoTransceiver = peerConnection.addTransceiver('video');
  
  const audioSink = new RTCAudioSink(audioTransceiver.receiver.track);
  const videoSink = new RTCVideoSink(videoTransceiver.receiver.track);

  const streams = [];

  videoSink.addEventListener('frame', ({ frame: { width, height, data }}) => {
    if (inited === false) 
    {
      console.log(`Frame size ${width}x${height}`);
      inited = true;
      startStream(width, height);
    }

    /*const size = width + 'x' + height;
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
    }*/

    //console.log(data)
    //a+=1
    //if (a==3) { startStream() }
    //console.log(width, height, data)

    //if (appsrc) {
    
    //console.log(data);
    appsrc.push(Buffer.from(data))
    //}
    
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
