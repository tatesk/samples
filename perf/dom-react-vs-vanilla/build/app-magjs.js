/**
 * Copyright 2015 Tomotaka SUWA. All rights reserved.
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

var app = {
  controller: function (props) {
    this.appendImages = function (callback) {
      var onFlickr = function (callback, images) {
        var newData = props.images.concat(images);

        var startDrawTime = window.performance.now();
        var jSStartExecutionTime = window.performance.now();

        console.time('MagJS Execution');

        // Go!
        props.images = newData;

        console.timeEnd('MagJS Execution');

        var jsExecutionTime = window.performance.now() - jSStartExecutionTime;

        console.time('Async');

        this.willupdate = function () {
          console.timeEnd('Async');
          console.time('Update');

          var startUpdateTime = window.performance.now();

          this.didupdate = function () {
            console.timeEnd('Update');
            console.time('Draw');

            var endUpdateTime = window.performance.now();

            var onNextFrameDone = function () {
              console.timeEnd('Draw');

              var updateTime = endUpdateTime - startUpdateTime;
              var jsTime = jsExecutionTime + updateTime;

              results.push({
                size: props.images.length,
                jsTime: jsTime,
                totalTime: window.performance.now() - startDrawTime
              });

              callback();
            };

            requestAnimationFrame(onNextFrameDone.bind(this));
          };
        };
      };

      this.willupdate = null;
      this.didupdate = null;

      flickr.search(searchTerms[searchIndex], 100)
        .then(onFlickr.bind(this, callback));
      
      searchIndex ++;
      searchIndex %= searchTerms.length;
    };
  },

  view: function (state, props) {
    state['header'] = {
      'refresh': {
        _onclick: function () {
          var refreshButton = this;

          refreshButton.disabled = true;

          state.appendImages(function () {
            refreshButton.disabled = false;
          });
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
