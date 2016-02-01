/**
 * Copyright 2016 Tomotaka SUWA. All rights reserved.
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
    return this.getLapTime(0, 1);
  },

  getTotalTime: function () {
    return this.getLapTime(0, 2);
  }
};

var app = {};

app.controller = function () {
  return {
    images: [],

    appendImages: function (node) {
      timekeeper.activate(node);

      m.startComputation();

      var onFlickr = function (foundImages) {
        var newData = this.images.concat(foundImages);

        timekeeper.tick();

        console.time('Mithril Execution');

        // Go!
        this.images = newData;

        m.endComputation();

        timekeeper.tick();

        console.timeEnd('Mithril Execution');

        var onNextFrameDone = function () {
          timekeeper.tick();

          results.push({
            size: this.images.length,
            jsTime: timekeeper.getJsTime(),
            totalTime: timekeeper.getTotalTime()
          });

          timekeeper.deactivate();
        };

        requestAnimationFrame(onNextFrameDone.bind(this));
      };

      flickr.search(searchTerms[searchIndex], 100)
        .then(onFlickr.bind(this));
      
      searchIndex ++;
      searchIndex %= searchTerms.length;
    },

    downloadResults: function () {
      var zip = new JSZip();

      resultsStr = results.reduce(function (previous, value, index) {
        return previous +
          value.size + ',' +
          value.jsTime + ',' +
          value.totalTime + '\n';
      }, 'Size,JavaScript Time,Total Time\n');

      zip.file('results-mithril.csv', resultsStr);
          
      var blob = zip.generate({type:'blob'});
      saveAs(blob, 'results-mithril.zip');
    }
  };
};

app.view = function (ctrl) {
  return [
    m('header', [
      'Image Puller: Mithril Edition',
      m('button', {
        class: 'refresh',
        onclick: function () {
          ctrl.appendImages(this);
        }
      }, 'Add images'),
      m('button', {
        class: 'download',
        onclick: function () {
          ctrl.downloadResults();
        }
      }, 'Download results')
    ]),
    m('main',
      m('div', { class: 'flickr-image-list' }, [
          ctrl.images.map(function (image, index) {
            var fromNow = moment(image.lastUpdated).fromNow();
            return m('div', { class: 'flickr-image', key: 'image-' + index },
                     m('h1', image.title),
                     m('div', { class: 'flickr-image-container' },
                       m('img', { src: image.imgUrl })
                      ),
                     m('h2', image.ownerName + ' - ' + image.license),
                     m('h3', 'Last updated: ' + fromNow),
                     m('a', { href: 'http://' + image.flickrUrl }, image.flickrUrl)
                    );
          })
        ]
       )
     )
  ];
};

console.time("Making container");
m.mount(document.getElementById("app"), app);
console.timeEnd("Making container");
