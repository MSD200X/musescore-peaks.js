/**
 * WAVEFORM.AXIS.JS
 *
 * This module handles all functionality related to drawing the
 * visualisations. Only a sigle object of this type is
 * instantiated meaning this code is reused multiple times.
 *
 */
define(["peaks/waveform/waveform.mixins", "konva"], function (mixins, Konva) {
  'use strict';

  /*
   * Rounds the given value up to the nearest given multiple.
   * e.g: roundUpToNearest(5.5, 3) returns 6
   *      roundUpToNearest(141.0, 10) returns 150
   *      roundUpToNearest(-5.5, 3) returns -6
   */

  function roundUpToNearest(value, multiple) {
    var remainder = value % multiple;
    if (remainder === 0) {
      return value;
    }
    else {
      return value + multiple - remainder;
    }
  }

  function WaveformAxis(view, viewOptions) {
    this.view = view; // store reference to waveform view object
    if (viewOptions === undefined || viewOptions === null) {
      viewOptions = {};
    }

    this.axisShape = new Konva.Shape({
      fill: 'rgba(38, 255, 161, 1)',
      strokeWidth: 0,
      opacity: 1
    });

    this.axisShape.sceneFunc(this.axisDrawFunction.bind(this, view, viewOptions));

    this.view.uiLayer.add(this.axisShape);
  }

  /*
   * Returns number of seconds for each x-axis marker, appropriate for the
   * current zoom level, ensuring that markers are not too close together
   * and that markers are placed at intuitive time intervals (i.e., every 1,
   * 2, 5, 10, 20, 30 seconds, then every 1, 2, 5, 10, 20, 30 minutes, then
   * every 1, 2, 5, 10, 20, 30 hours).
   */

  WaveformAxis.prototype.getAxisLabelScale = function() {
    var baseSecs   = 1; // seconds
    var steps      = [1, 2, 5, 10, 20, 30];
    var minSpacing = 60;
    var index      = 0;

    var secs;

    for (;;) {
      secs = baseSecs * steps[index];
      var pixels = this.view.data.at_time(secs);
      if (pixels < minSpacing) {
        if (++index == steps.length) {
          baseSecs *= 60; // seconds -> minutes -> hours
          index = 0;
        }
      }
      else {
        break;
      }
    }
    return secs;
  };


  /**
   * @param {WaveformZoomview} view
   * @param {Object} [viewOptions] configuration options
   * @param {String} [viewOptions.axisGridlineColor] color code to use for the grid lines
   * @param {String} [viewOptions.axisLabelColor] color code to use for labels
   * @param {Konva.Context} context
   */
  WaveformAxis.prototype.axisDrawFunction = function (view, viewOptions, context) {
    var currentFrameStartTime = view.data.time(view.frameOffset);

    // Draw axis markers
    var markerHeight = 10;

    // Time interval between axis markers (seconds)
    var axisLabelIntervalSecs = this.getAxisLabelScale();

    // Time of first axis marker (seconds)
    var firstAxisLabelSecs = roundUpToNearest(currentFrameStartTime, axisLabelIntervalSecs);

    // Distance between waveform start time and first axis marker (seconds)
    var axisLabelOffsetSecs = firstAxisLabelSecs - currentFrameStartTime;

    // Distance between waveform start time and first axis marker (pixels)
    var axisLabelOffsetPixels = this.view.data.at_time(axisLabelOffsetSecs);
    var axisGridlineColor = viewOptions.axisGridlineColor || this.view.options.axisGridlineColor;
    var axisLabelColor = viewOptions.axisLabelColor || this.view.options.axisLabelColor;

    context.setAttr('strokeStyle', axisGridlineColor);
    context.setAttr('lineWidth', 1);

    // Set text style
    context.setAttr('font', "11px sans-serif");
    context.setAttr('fillStyle', axisLabelColor);
    context.setAttr('textAlign', "left");
    context.setAttr('textBaseline', "bottom");

    var secs = firstAxisLabelSecs;
    var x;

    for (;;) {
      // Position of axis marker (pixels)
      x = axisLabelOffsetPixels + this.view.data.at_time(secs - firstAxisLabelSecs);
      if (x >= this.view.width) {
        break;
      }

      // Draw the axis out old-skool canvas style

      context.beginPath();
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, 0 + markerHeight);
      context.moveTo(x + 0.5, this.view.height);
      context.lineTo(x + 0.5, this.view.height - markerHeight);
      context.stroke();

      var label      = mixins.niceTime(secs, true);
      var labelWidth = context._context.measureText(label).width; // todo handle this with Konva.Text
      var labelX     = x - labelWidth / 2;
      var labelY     = this.view.height - 1 - markerHeight;

      if (labelX >= 0) {
        context.fillText(label, labelX, labelY);
      }

      secs += axisLabelIntervalSecs;
    }
  };

  return WaveformAxis;
});
