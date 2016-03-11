Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Layer:Heatmap',
  init: function(data) {
    return new ol.layer.Heatmap(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Interaction:DoubleClickZoom',
  init: function(data) {
    return new ol.interaction.DoubleClickZoom(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Component:Tooltip',
  init: function(data) {
    var map = data.map;

    var container = jQuery('<div/>', {
      id: 'tooltip',
      'class': 'ol-tooltip'
    }).appendTo('body');
    var content = jQuery('<div/>', {
      id: 'tooltip-content'
    }).appendTo('#tooltip');

    var container = document.getElementById('tooltip');
    var content = document.getElementById('tooltip-content');

    /**
     * Create an overlay to anchor the popup to the map.
     */
    var overlay = new ol.Overlay({
      element: container,
      positioning: data.opt.positioning
    });

    map.addOverlay(overlay);

    jQuery(map.getViewport()).on('mousemove', function(evt) {
      var pixel = map.getEventPixel(evt.originalEvent);
      var coordinates = map.getEventCoordinate(evt.originalEvent);

      var feature = map.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (layer.mn == data.opt.layer) {
          return feature;
        }
      });

      if (feature) {
        var name = feature.get('name') || '';
        var description = feature.get('description') || '';

        overlay.setPosition(coordinates);
        content.innerHTML = '<div class="ol-tooltip-name">' + name + '</div><div class="ol-tooltip-description">' + description + '</div>';
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Component:Popup',
  init: function(data) {
    var map = data.map;
    var random = (new Date()).getTime();

    /**
     * Name for unique ID property. Initialized in a way to help avoid collisions
     * with other closure JavaScript on the same page.
     * @type {string}
     * @private
     */
    UID_PROPERTY_ = 'closure_uid_' + ((Math.random() * 1e9) >>> 0);

    var container = jQuery('<div/>', {
      id: 'popup-' + random,
      'class': 'ol-popup'
    }).appendTo('body');
    var content = jQuery('<div/>', {
      id: 'popup-content-' + random
    }).appendTo('#popup-' + random);

    var container = document.getElementById('popup-' + random);
    var content = document.getElementById('popup-content-' + random);

    if (data.opt.closer !== undefined && data.opt.closer !== 0) {
      var closer = jQuery('<a/>', {
        href: '#',
        id: 'popup-closer-' + random,
        'class': 'ol-popup-closer'
      }).appendTo('#popup-' + random);

      var closer = document.getElementById('popup-closer-' + random);

      /**
       * Add a click handler to hide the popup.
       * @return {boolean} Don't follow the href.
       */
      closer.onclick = function() {
        container.style.display = 'none';
        closer.blur();
        return false;
      };
    }

    /**
     * Create an overlay to anchor the popup to the map.
     */

    var overlay = new ol.Overlay({
      element: container,
      positioning: data.opt.positioning,
      autoPan: data.opt.autoPan,
      autoPanAnimation: {
        duration: data.opt.autoPanAnimation
      },
      autoPanMargin: data.opt.autoPanMargin
    });

    map.addOverlay(overlay);

    map.on('click', function(evt) {
      var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        if (data.opt.frontend_layers[layer.mn] !== undefined) {
          return feature;
        }
      });
      if (feature) {
        jQuery(container).data('feature-key', feature[UID_PROPERTY_]);

        // If the feature is a cluster, then create a list of names and add it
        // to the overall feature's description. Wrap it in a container with
        // a max-height and overflow: scroll so it doesn't get too big.
        var features = feature.get('features');
        if (features !== undefined) {
          var names = [];
          features.forEach(function (item) {
            if (item.get('name') !== undefined) {
              names.push(item.get('name'));
            }
          });
          if (names.length != 0) {
            feature.set('description', '<ul><li>' + names.join('</li><li>') + '</li></ul>');
          }
          feature.set('name', names.length + ' item(s):');
        }

        var name = feature.get('name') || '';
        var description = feature.get('description') || '';

        if (name != '' || description != '') {
          content.innerHTML = '<div class="ol-popup-content"><div class="ol-popup-name">' + name + '</div><div class="ol-popup-description">' + description + '</div></div>';
          container.style.display = 'block';
          overlay.setPosition(evt.coordinate);
        }
      }
    });
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Component:InlineJS',
  init: function(data) {
    eval(data.opt.javascript);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Source:KML',
  init: function(data) {
    data.opt.format = new ol.format.KML({
      extractStyles: false
    });
    return new ol.source.Vector(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Source:Stamen',
  init: function(data) {
    return new ol.source.Stamen(data.opt);
  }
});
;
