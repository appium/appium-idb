import _ from 'lodash';
import { exec } from 'teen_process';
import { spawn } from 'node:child_process';
import log from '../logger.js';
import { util } from '@appium/support';
import B from 'bluebird';

const DEFAULT_STARTUP_TIMEOUT_MS = 30000;
const KILL_SIGNAL = 2; // SIGINT
const FORMAT_H264 = 'h264';

const videoCommands = {};

/**
 * @typedef {Object} VideoStreamingOptions
 *
 * @property {number} [timeoutMs=30000] The number of millisecods to wait until
 * the video streaming starts.
 * @property {number} [fps] The number of frames that are produced by idb per second.
 * This can be arbitrarily large or small.
 * A higher frame rate will increase system utilization.
 * Increasing the fps may not result in smoother presentation, as an iOS Simulator
 * may be refreshing it's screen less frequently than the target frame rate.
 * Typically an iOS Simulator may not render transparencies at 60fps.
 * Default is a dynamic fps (not recommended).
 * @property {'h264'|'rbga'|'mjpeg'|'minicap'} format Represents the format of the video stream itself.
 * A variety of outputs are available:
 * - h264 This is an Annexe-B H.264 Stream
 * - rbga is a stream of raw RBGA bytes.
 * - mjpeg is an stream of encoed JPEG images, typically called MJPEG.
 * - minicap is format used by the minicap project. It's fundementally a MJPEG
 * stream with a header at the start of the stream and length headers per frame.
 * @property {number} [compressionQuality=1.0] 1.0 represents the quality level used for encoded frames,
 * this is a value between 0.0 and 1.0. It applies to all formats except for the raw rbga format.
 * @property {number} [scaleFactor=1.0] The scale factor for the source video (between 0 and 1.0) for the stream
 * @property {string} [outputFile] The target .mp4 file for the h264-encoded output.
 * When omitted, the stream will be written to stdout.
 */

/**
 * Runs video streaming from device or simulator
 *
 * @see https://fbidb.io/docs/video/
 * @this {import('../idb.js').IDB}
 * @param {VideoStreamingOptions} opts
 * @returns {Promise<import('node:child_process').ChildProcessWithoutNullStreams>}
 */
videoCommands.startVideoStream = async function startVideoStream (opts) {
  /** @type {string[]} */
  const args = [];
  if (!_.isNil(opts.fps)) {
    args.push('--fps', `${opts.fps}`);
  }
  if (_.isNil(opts.format)) {
    throw new Error('The format of the output stream must be provided');
  } else {
    args.push('--format', opts.format);
  }
  if (!_.isNil(opts.compressionQuality)) {
    args.push('--compression-quality', `${opts.compressionQuality}`);
  }
  if (!_.isNil(opts.scaleFactor)) {
    args.push('--scale-factor', `${opts.scaleFactor}`);
  }
  if (!_.isNil(opts.outputFile)) {
    if (opts.format !== FORMAT_H264) {
      throw new Error(
        `The format of the output stream must be set to '${FORMAT_H264}' in order ` +
        `to record to a file. '${opts.format}' has been provided instead.`
      );
    }
    args.push(opts.outputFile);
  }
  const idbArgs = ['video-stream', ...this.executable.defaultArgs, ...args];
  log.debug(`Spawning IDB with args: ${util.quote(idbArgs)}`);
  const videoStreamProcess = spawn(this.executable.path, idbArgs);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
  try {
    await new B((resolve, reject) => {
      let errorMessageChunks = [];
      videoStreamProcess.stderr.on('data', (data) => {errorMessageChunks.push(data);});
      videoStreamProcess.stdout.once('data', () => {resolve();});
      videoStreamProcess.once('error', (err) => {
        reject(
          new Error(`The IDB video streamer has failed to start. Original error: ${err.message}; stderr: ` +
            Buffer.concat(errorMessageChunks).toString('utf8')
          )
        );
      });
      videoStreamProcess.once('close', (code) => {
        reject(
          new Error(`The IDB video streamer has exited unexpectedly with code ${code}, stderr: ` +
            Buffer.concat(errorMessageChunks).toString('utf8')
          )
        );
      });
    }).timeout(
      timeoutMs,
      `The IDB video streamer has failed to start streaming after ${timeoutMs}ms timeout`
    );
  } catch (e) {
    videoStreamProcess.kill();
    throw e;
  } finally {
    videoStreamProcess.stderr.removeAllListeners('data');
    videoStreamProcess.stdout.removeAllListeners('data');
    videoStreamProcess.removeAllListeners('error');
    videoStreamProcess.removeAllListeners('close');
  }
  return videoStreamProcess;
};

/**
 * Stops video streaming from device or simulator
 *
 * @see https://fbidb.io/docs/video/
 * @this {import('../idb.js').IDB}
 * @param {import('node:child_process').ChildProcessWithoutNullStreams?} [process] If provided
 * then only this process will be killed, otherwise all matching idb video streaming processes
 * for the particluar device udid will be terminated via SIGINT.
 */
videoCommands.stopVideoStream = async function stopVideoStream (process = null) {
  if (process) {
    process.kill(KILL_SIGNAL);
  } else {
    try {
      await exec('pkill', [`-${KILL_SIGNAL}`, '-f', ['idb', 'video-stream', this.udid].join('.*')]);
    } catch (ign) {}
  }
};

export default videoCommands;
