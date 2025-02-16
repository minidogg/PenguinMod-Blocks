/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Colour input field.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.FieldColourSlider');

goog.require('Blockly.Field');
goog.require('Blockly.DropDownDiv');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.style');
goog.require('goog.color');
goog.require('goog.ui.Slider');

/**
 * Class for a slider-based colour input field.
 * @param {string} colour The initial colour in '#rrggbb' format.
 * @param {Function=} opt_validator A function that is executed when a new
 *     colour is selected.  Its sole argument is the new colour value.  Its
 *     return value becomes the selected colour, unless it is undefined, in
 *     which case the new colour stands, or it is null, in which case the change
 *     is aborted.
 * @extends {Blockly.Field}
 * @constructor
 */
Blockly.FieldColourSlider = function(colour, opt_validator) {
  Blockly.FieldColourSlider.superClass_.constructor.call(this, colour, opt_validator);
  this.addArgType('colour');

  // Flag to track whether or not the slider callbacks should execute
  this.sliderCallbacksEnabled_ = false;
};
goog.inherits(Blockly.FieldColourSlider, Blockly.Field);

/**
 * Construct a FieldColourSlider from a JSON arg object.
 * @param {!Object} options A JSON object with options (colour).
 * @returns {!Blockly.FieldColourSlider} The new field instance.
 * @package
 * @nocollapse
 */
Blockly.FieldColourSlider.fromJson = function(options) {
  return new Blockly.FieldColourSlider(options['colour']);
};

/**
 * Function to be called if eyedropper can be activated.
 * If defined, an eyedropper button will be added to the color picker.
 * The button calls this function with a callback to update the field value.
 * BEWARE: This is not a stable API, so it is being marked as private. It may change.
 * @private
 */
Blockly.FieldColourSlider.activateEyedropper_ = null;

/**
 * Path to the eyedropper svg icon.
 */
Blockly.FieldColourSlider.EYEDROPPER_PATH = 'eyedropper.svg';

/**
 * Install this field on a block.
 * @param {!Blockly.Block} block The block containing this field.
 */
Blockly.FieldColourSlider.prototype.init = function(block) {
  if (this.fieldGroup_) {
    // Colour slider has already been initialized once.
    return;
  }
  Blockly.FieldColourSlider.superClass_.init.call(this, block);
  this.setValue(this.getValue(true));
};

/**
 * Return the current colour.
 * @return {string} Current colour in '#rrggbbaa' format.
 */
Blockly.FieldColourSlider.prototype.getValue = function() {
  return this.colour_;
};

/**
 * Set the colour.
 * @param {string} colour The new colour in '#rrggbb' format.
 */
Blockly.FieldColourSlider.prototype.setValue = function(colour) {
  if (this.sourceBlock_ && Blockly.Events.isEnabled() &&
      this.colour_ != colour) {
    Blockly.Events.fire(new Blockly.Events.BlockChange(
        this.sourceBlock_, 'field', this.name, this.colour_, colour));
  }
  this.colour_ = colour;
  if (this.sourceBlock_) {
    // Set the primary, secondary and tertiary colour to this value.
    // The renderer expects to be able to use the secondary colour as the fill for a shadow.
    var main = colour.slice(0, 7)

    this.sourceBlock_.setColour(main, main, this.sourceBlock_.getColourTertiary());
  }
  this.updateSliderHandles_();
  this.updateDom_();
};

/**
 * Create the hue, saturation or value CSS gradient for the slide backgrounds.
 * @param {string} channel – Either "hue", "saturation" or "value".
 * @return {string} Array colour hex colour stops for the given channel
 * @private
 */
Blockly.FieldColourSlider.prototype.createColourStops_ = function(channel) {
  var stops = [];
  for(var n = 0; n <= 360; n += 20) {
    switch (channel) {
      case 'hue':
        stops.push(goog.color.hsvaToHex(n, this.saturation_, this.brightness_, this.transparency_));
        break;
      case 'saturation':
        stops.push(goog.color.hsvaToHex(this.hue_, n / 360, this.brightness_, this.transparency_));
        break;
      case 'brightness':
        stops.push(goog.color.hsvaToHex(this.hue_, this.saturation_, 255 * n / 360, this.transparency_));
        break;
      case 'transparency':
        stops.push(goog.color.hsvaToHex(this.hue_, this.saturation_, this.brightness_, n / 360));
        break;
      default:
        throw new Error("Unknown channel for colour sliders: " + channel);
    }
  }
  return stops;
};

/**
 * Set the gradient CSS properties for the given node and channel
 * @param {Node} node - The DOM node the gradient will be set on.
 * @param {string} channel – Either "hue", "saturation" or "value".
 * @private
 */
Blockly.FieldColourSlider.prototype.setGradient_ = function(node, channel) {
  var gradient = this.createColourStops_(channel).join(',');
  goog.style.setStyle(node, 'background-image',
      '-moz-linear-gradient(left, ' + gradient + '), url("static/assets/482dc5011057fe26e9542e9476601bf2.png")');
  goog.style.setStyle(node, 'background-image',
      '-webkit-linear-gradient(left, ' + gradient + '), url("static/assets/482dc5011057fe26e9542e9476601bf2.png")');
  goog.style.setStyle(node, 'background-image',
      '-o-linear-gradient(left, ' + gradient + '), url("static/assets/482dc5011057fe26e9542e9476601bf2.png")');
  goog.style.setStyle(node, 'background-image',
      '-ms-linear-gradient(left, ' + gradient + '), url("static/assets/482dc5011057fe26e9542e9476601bf2.png")');
  goog.style.setStyle(node, 'background-image',
      'linear-gradient(left, ' + gradient + '), url("static/assets/482dc5011057fe26e9542e9476601bf2.png")');
};

/**
 * Update the readouts and slider backgrounds after value has changed.
 * @private
 */
Blockly.FieldColourSlider.prototype.updateDom_ = function() {
  if (this.hueSlider_) {
    // Update the slider backgrounds
    this.setGradient_(this.hueSlider_.getElement(), 'hue');
    this.setGradient_(this.saturationSlider_.getElement(), 'saturation');
    this.setGradient_(this.brightnessSlider_.getElement(), 'brightness');
    this.setGradient_(this.transparencySlider_.getElement(), 'transparency');

    // Update the readouts
    this.hueReadout_.textContent = Math.floor(100 * this.hue_ / 360).toFixed(0);
    this.saturationReadout_.textContent = Math.floor(100 * this.saturation_).toFixed(0);
    this.brightnessReadout_.textContent = Math.floor(100 * this.brightness_ / 255).toFixed(0);
    this.transparencyReadout_.textContent = Math.floor(100 * this.transparency_).toFixed(0);
  }
};

/**
 * Update the slider handle positions from the current field value.
 * @private
 */
Blockly.FieldColourSlider.prototype.updateSliderHandles_ = function() {
  if (this.hueSlider_) {
    // Don't let the following calls to setValue for each of the sliders
    // trigger the slider callbacks (which then call setValue on this field again
    // unnecessarily)
    this.sliderCallbacksEnabled_ = false;
    this.hueSlider_.setValue(this.hue_);
    this.saturationSlider_.setValue(this.saturation_);
    this.brightnessSlider_.setValue(this.brightness_);
    this.transparencySlider_.setValue(this.transparency_);
    this.sliderCallbacksEnabled_ = true;
  }
};

/**
 * Create label and readout DOM elements, returning the readout
 * @param {string} labelText - Text for the label
 * @return {Array} The container node and the readout node.
 * @private
 */
Blockly.FieldColourSlider.prototype.createLabelDom_ = function(labelText) {
  var labelContainer = document.createElement('div');
  labelContainer.setAttribute('class', 'scratchColourPickerLabel');
  var readout = document.createElement('span');
  readout.setAttribute('class', 'scratchColourPickerReadout');
  var label = document.createElement('span');
  label.setAttribute('class', 'scratchColourPickerLabelText');
  label.textContent = labelText;
  labelContainer.appendChild(label);
  labelContainer.appendChild(readout);
  return [labelContainer, readout];
};

/**
 * Factory for creating the different slider callbacks
 * @param {string} channel - One of "hue", "saturation" or "brightness"
 * @return {function} the callback for slider update
 * @private
 */
Blockly.FieldColourSlider.prototype.sliderCallbackFactory_ = function(channel) {
  var thisField = this;
  return function(event) {
    if (!thisField.sliderCallbacksEnabled_) return;
    var channelValue = event.target.getValue();
    switch (channel) {
      case 'hue':
        thisField.hue_ = channelValue;
        break;
      case 'saturation':
        thisField.saturation_ = channelValue;
        break;
      case 'brightness':
        thisField.brightness_ = channelValue;
        break;
      case 'transparency':
        thisField.transparency_ = channelValue;
        break;
      default:
        throw new Error('invalid channel type: ' + channel)
    }
    var colour = goog.color.hsvaToHex(thisField.hue_, thisField.saturation_, thisField.brightness_, thisField.transparency_);
    if (thisField.sourceBlock_) {
      // Call any validation function, and allow it to override.
      colour = thisField.callValidator(colour);
    }
    if (colour !== null) {
      thisField.setValue(colour, true);
    }
  };
};

/**
 * Activate the eyedropper, passing in a callback for setting the field value.
 * @private
 */
Blockly.FieldColourSlider.prototype.activateEyedropperInternal_ = function() {
  var thisField = this;
  Blockly.FieldColourSlider.activateEyedropper_(function(value) {
    // Update the internal hue/saturation/brightness values so sliders update.
    var hsv = goog.color.hexToHsva(value);
    thisField.hue_ = hsv[0];
    thisField.saturation_ = hsv[1];
    thisField.brightness_ = hsv[2];
    thisField.transparency_ = hsv[3];
    thisField.setValue(value);
  });
};

/**
 * Create hue, saturation and brightness sliders under the colour field.
 * @private
 */
Blockly.FieldColourSlider.prototype.showEditor_ = function() {
  Blockly.DropDownDiv.hideWithoutAnimation();
  Blockly.DropDownDiv.clearContent();
  var div = Blockly.DropDownDiv.getContentDiv();

  // Init color component values that are used while the editor is open
  // in order to keep the slider values stable.
  var hsv = goog.color.hexToHsva(this.getValue(true));
  this.hue_ = hsv[0];
  this.saturation_ = hsv[1];
  this.brightness_ = hsv[2];
  this.transparency_ = hsv[3];

  var hueElements = this.createLabelDom_(Blockly.Msg.COLOUR_HUE_LABEL);
  div.appendChild(hueElements[0]);
  this.hueReadout_ = hueElements[1];
  this.hueSlider_ = new goog.ui.Slider();
  this.hueSlider_.setUnitIncrement(5);
  this.hueSlider_.setMinimum(0);
  this.hueSlider_.setMaximum(360);
  this.hueSlider_.setMoveToPointEnabled(true);
  this.hueSlider_.render(div);

  var saturationElements =
      this.createLabelDom_(Blockly.Msg.COLOUR_SATURATION_LABEL);
  div.appendChild(saturationElements[0]);
  this.saturationReadout_ = saturationElements[1];
  this.saturationSlider_ = new goog.ui.Slider();
  this.saturationSlider_.setMoveToPointEnabled(true);
  this.saturationSlider_.setUnitIncrement(0.01);
  this.saturationSlider_.setStep(0.001);
  this.saturationSlider_.setMinimum(0);
  this.saturationSlider_.setMaximum(1.0);
  this.saturationSlider_.render(div);

  var brightnessElements =
      this.createLabelDom_(Blockly.Msg.COLOUR_BRIGHTNESS_LABEL);
  div.appendChild(brightnessElements[0]);
  this.brightnessReadout_ = brightnessElements[1];
  this.brightnessSlider_ = new goog.ui.Slider();
  this.brightnessSlider_.setUnitIncrement(2);
  this.brightnessSlider_.setMinimum(0);
  this.brightnessSlider_.setMaximum(255);
  this.brightnessSlider_.setMoveToPointEnabled(true);
  this.brightnessSlider_.render(div);

  var transparencyElements =
      this.createLabelDom_('Transparency');
  div.appendChild(transparencyElements[0]);
  this.transparencyReadout_ = transparencyElements[1];
  this.transparencySlider_ = new goog.ui.Slider();
  this.transparencySlider_.setUnitIncrement(0.01);
  this.transparencySlider_.setStep(0.001);
  this.transparencySlider_.setMinimum(0);
  this.transparencySlider_.setMaximum(1.0);
  this.transparencySlider_.setMoveToPointEnabled(true);
  this.transparencySlider_.render(div);

  if (Blockly.FieldColourSlider.activateEyedropper_) {
    var button = document.createElement('button');
    button.setAttribute('class', 'scratchEyedropper');
    var image = document.createElement('img');
    image.src = Blockly.mainWorkspace.options.pathToMedia + Blockly.FieldColourSlider.EYEDROPPER_PATH;
    button.appendChild(image);
    div.appendChild(button);
    Blockly.FieldColourSlider.eyedropperEventData_ =
        Blockly.bindEventWithChecks_(button, 'click', this,
            this.activateEyedropperInternal_);
  }

  Blockly.DropDownDiv.setColour('#ffffff', '#dddddd');
  Blockly.DropDownDiv.setCategory(this.sourceBlock_.parentBlock_.getCategory());
  Blockly.DropDownDiv.showPositionedByBlock(this, this.sourceBlock_);

  // Set value updates the slider positions
  // Do this before attaching callbacks to avoid extra events from initial set
  this.setValue(this.getValue(true));

  // Enable callbacks for the sliders
  this.sliderCallbacksEnabled_ = true;

  Blockly.FieldColourSlider.hueChangeEventKey_ = goog.events.listen(this.hueSlider_,
      goog.ui.Component.EventType.CHANGE,
      this.sliderCallbackFactory_('hue'));
  Blockly.FieldColourSlider.saturationChangeEventKey_ = goog.events.listen(this.saturationSlider_,
      goog.ui.Component.EventType.CHANGE,
      this.sliderCallbackFactory_('saturation'));
  Blockly.FieldColourSlider.brightnessChangeEventKey_ = goog.events.listen(this.brightnessSlider_,
      goog.ui.Component.EventType.CHANGE,
      this.sliderCallbackFactory_('brightness'));
  Blockly.FieldColourSlider.transparencyChangeEventKey_ = goog.events.listen(this.transparencySlider_,
      goog.ui.Component.EventType.CHANGE,
      this.sliderCallbackFactory_('transparency'));
};

Blockly.FieldColourSlider.prototype.dispose = function() {
  if (Blockly.FieldColourSlider.hueChangeEventKey_) {
    goog.events.unlistenByKey(Blockly.FieldColourSlider.hueChangeEventKey_);
  }
  if (Blockly.FieldColourSlider.saturationChangeEventKey_) {
    goog.events.unlistenByKey(Blockly.FieldColourSlider.saturationChangeEventKey_);
  }
  if (Blockly.FieldColourSlider.brightnessChangeEventKey_) {
    goog.events.unlistenByKey(Blockly.FieldColourSlider.brightnessChangeEventKey_);
  }
  if (Blockly.FieldColourSlider.transparencyChangeEventKey_) {
    goog.events.unlistenByKey(Blockly.FieldColourSlider.transparencyChangeEventKey_);
  }
  if (Blockly.FieldColourSlider.eyedropperEventData_) {
    Blockly.unbindEvent_(Blockly.FieldColourSlider.eyedropperEventData_);
  }
  Blockly.Events.setGroup(false);
  Blockly.FieldColourSlider.superClass_.dispose.call(this);
};

Blockly.Field.register('field_colour_slider', Blockly.FieldColourSlider);
