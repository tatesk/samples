/**
 * Copyright 2015-2016 Tomotaka SUWA. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var results = [];
var searchIndex = 0;
var searchTerms = [
  'tree', 'water', 'fire', 'earth', 'metal', 'wood',
  'blue', 'red', 'yellow', 'mountain', 'tunnel', 'train', 'brick',
  'architecture'
];

var timekeeper = {
  updated: false,
  times: [],
  node: null,
  button: {},

  activate: function (button) {
    this.button = button || {};
    this.updated = false;
    this.times = [];

    this.button.disabled = true;
  },

  deactivate: function () {
    this.updated = true;

    if (this.button) {
      this.button.disabled = false;
    }
  },

  tick: function () {
    this.times.push(window.performance.now());
  },

  getLapTime: function (i, j) {
    var from = Math.min(i, j);
    var to = Math.max(i, j);

    if (this.times.length < to) {
      throw new Error('Not found a pair of time to measure a lap time');
    }

    return this.times[to] - this.times[from];
  },

  getJsTime: function () {
    return this.getLapTime(0, 1) + this.getLapTime(2, 3);
  },

  getTotalTime: function () {
    return this.getLapTime(0, 4);
  }
};

var app = {
  controller: function (props) {
    this.isupdate = function (e) {
      if (timekeeper.updated) {
        e.preventDefault();
      }
    };

    this.willupdate = function () {
      timekeeper.tick();
    };

    this.didupdate = function () {
      timekeeper.tick();

      console.timeEnd('MagJS Execution');

      if (props.images.length > 0) {
        var onNextFrameDone = function () {
          timekeeper.tick();

          results.push({
            size: props.images.length,
            jsTime: timekeeper.getJsTime(),
            totalTime: timekeeper.getTotalTime()
          });

          timekeeper.deactivate();
        };

        requestAnimationFrame(onNextFrameDone.bind(this));
      }
    };

    this.appendImages = function (node) {
      timekeeper.activate(node);

      var onFlickr = function (images) {
        var newData = props.images.concat(images);

        timekeeper.tick();

        console.time('MagJS Execution');

        // Go!
        props.images = newData;

        timekeeper.tick();
      };

      flickr.search(searchTerms[searchIndex], 100)
        .then(onFlickr.bind(this));
      
      searchIndex ++;
      searchIndex %= searchTerms.length;
    };
  },

  view: function (state, props) {
    state['header'] = {
      'refresh': {
        _onclick: function (e) {
          state.appendImages(this);
        }
      },

      'download': {
        _config: function (node) {
          node.disabled = (results.length === 0);
        },

        _onclick: function () {
          var zip = new JSZip();

          resultsStr = results.reduce(function (previous, value, index) {
            return previous +
              value.size + ',' +
              value.jsTime + ',' +
              value.totalTime + '\n';
          }, 'Size,JavaScript Time,Total Time\n');

          zip.file('results-mag.csv', resultsStr);
          
          var blob = zip.generate({type:'blob'});
          saveAs(blob, 'results-mag.zip');
        }
      }
    };

    state['main'] = {
      _config: function (node) {
        if (props.images.length > 0) {
          node.style = 'block';
        } else {
          node.style = 'none';
        }
      },

      'flickr-image': props.images.map(function (image, index) {
        var fromNow = moment(image.lastUpdated).fromNow();
        return {
          _id: 'image-' + index,
          h1: image.title,
          img: {
            _src: image.imgUrl
          },
          h2: image.ownerName + ' - ' + image.license,
          h3: 'Last updated: ' + fromNow,
          a: {
            _href: 'http://' + image.flickrUrl,
            _text: image.flickrUrl
          }
        };
      })
    };
  }
};

console.time("Making container");
mag.module('body', app, { images: [] });
console.timeEnd("Making container");
