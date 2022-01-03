'use strict';

var a = 0
var appsrc = null
var videoSink = null

const args = require('args-parser')(process.argv);
console.log(args);
const use_autosink = args.auto

const { PassThrough } = require('stream')
const fs = require('fs')
const gstreamer = require("gstreamer-superficial");

const { RTCAudioSink, RTCVideoSink } = require('wrtc').nonstandard;
const { RTCRtpSender } = require('wrtc');

let UID = 0;
var inited = false
//const pipeline2 = new gstreamer.Pipeline("appsrc name=mysource is-live=true ! videoconvert ! autovideosink");

var pipeline = null
async function startStream(width, height) {
  var sink = null
  if (!use_autosink) { 
    sink = "ndisinkcombiner name=combiner ! ndisink ndi-name='My NDI source' "
  }
  else {
    sink = "autovideosink sync=false"
  }

  pipeline = new gstreamer.Pipeline(
    "appsrc name=mysource is-live=true  max-buffers=1 max-latency=1 ! " +
    //`video/x-raw,format=I420,width=${width},height=${height},framerate=30/1 ! ` +
    "rawvideoparse use-sink-caps=true !  " +
    //`videoconvert ! videoscale ! ` +
    //`video/x-raw,format=I420,width=${width*2},height=${height*2},framerate=1000/1 ! ` +
    " videoconvert ! " +
    "tee name=t " +
    "t. ! queue ! ndisinkcombiner name=combiner ! ndisink ndi-name='My NDI source' " +
    "t. ! queue ! autovideosink sync=false"

    //sink
    //+
    //"audiotestsrc is-live=true ! audioconvert ! combiner.audio"
  );

  /*pipeline.pollBus(msg => {
    console.log(msg);
  });*/

  appsrc = pipeline.findChild('mysource')
  appsrc.caps = `video/x-raw,format=I420,width=${width},height=${height},framerate=30/1`
  pipeline.play()
}

var last_width = 0
var last_height = 0
async function stopStream() 
{
  if (pipeline) {
    pipeline.sendEOS()
    pipeline = null
    appsrc = null
  }
  last_width = 0
  last_height = 0
}

async function frame_listener({ frame: { width, height, data }}) {
    //console.log(`Frame size ${width}x${height}`);
    //console.log(data)

    /*if (!inited)
    {
      inited = true;
      await startStream(width, height);
    }*/
    
    if (last_width!=width && last_height!=height)
    {
      await stopStream()
      await startStream(width, height);
    }
    last_width = width
    last_height = height    

    appsrc.push(Buffer.from(data))
}

async function beforeOffer(peerConnection) {
  const audioTransceiver = peerConnection.addTransceiver('audio');
  const videoTransceiver = peerConnection.addTransceiver('video');

  const audioSink = new RTCAudioSink(audioTransceiver.receiver.track);
  videoSink = new RTCVideoSink(videoTransceiver.receiver.track);

  const streams = [];

  videoSink.addEventListener('frame', frame_listener);

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
