Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Layer:Vector',
  init: function(data) {

    var layer = new ol.layer.Vector(data.opt);
    // Check if this layer is activated for dedicated zoom levels.
    if (data.opt.zoomActivity) {
      var zoomSpecificVisibility = function() {
        layer.setVisible(data.opt.zoomActivity[data.map.getView().getZoom()] !== undefined);
      };
      data.map.getView().on('change:resolution', zoomSpecificVisibility);
    }

    return layer;
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Component:ZoomToSource',
  init: function(data) {
    var map = data.map;

    function getLayersFromObject(object) {
      var layersInside = new ol.Collection();

      object.getLayers().forEach(function(layer) {
        if (layer instanceof ol.layer.Group) {
          layersInside.extend(getLayersFromObject(layer).getArray());
        } else {
          if (typeof layer.getSource === 'function') {
            layersInside.push(layer);
          }
        }
      });

      return layersInside;
    }

    var calculateMaxExtent = function() {
      var maxExtent = ol.extent.createEmpty();

      layers.forEach(function (layer) {
        var source = layer.getSource();
        if (typeof source.getFeatures === 'function') {
          if (source.getFeatures().length !== 0) {
            ol.extent.extend(maxExtent, source.getExtent());
          }
        }
      });

      return maxExtent;
    };

    var zoomToSource = function(source) {
      if (!data.opt.process_once || !data.opt.processed_once) {
        data.opt.processed_once = true;

        if (data.opt.enableAnimations === 1) {
          var animationPan = ol.animation.pan({
            duration: data.opt.animations.pan,
            source: map.getView().getCenter()
          });
          var animationZoom = ol.animation.zoom({
            duration: data.opt.animations.zoom,
            resolution: map.getView().getResolution()
          });
          map.beforeRender(animationPan, animationZoom);
        }

        var maxExtent = calculateMaxExtent();
        if (!ol.extent.isEmpty(maxExtent)) {
          map.getView().fit(maxExtent, map.getSize());
        }

        if (data.opt.zoom !== 'disabled') {
          if (data.opt.zoom !== 'auto') {
            map.getView().setZoom(data.opt.zoom);
          } else {
            var zoom = map.getView().getZoom();
            if (data.opt.max_zoom !== undefined && data.opt.max_zoom > 0 && zoom > data.opt.max_zoom) {
              zoom = data.opt.max_zoom;
            }
            map.getView().setZoom(zoom);
          }
        }
      }
    };

    var layers = getLayersFromObject(map);
    layers.forEach(function (layer) {
      var source = layer.getSource();

      // Only zoom to a source if it's in the configured list of sources.
      if (typeof data.opt.source[source.mn] !== 'undefined') {
        source.on('change', zoomToSource, source);
        if (typeof source.getFeatures === 'function') {
          if (source.getFeatures().length !== 0) {
            zoomToSource.call(source);
          }
        }
      }
    });
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Source:Vector',
  init: function(data) {

    var options = {
      features: []
    };
    if (data.opt !== undefined && data.opt.features !== undefined) {
      // Ensure the features are really an array.
      if (!(data.opt.features instanceof Array)) {
        data.opt.features = [{wkt: data.opt.features}];
      }
      for (var i in data.opt.features) {
        if (data.opt.features[i].wkt) {
          try {
            var data_projection = data.opt.features[i].projection || 'EPSG:4326';
            var feature = new ol.format.WKT().readFeature(data.opt.features[i].wkt, {
              dataProjection: data_projection,
              featureProjection: data.map.getView().getProjection()
            });
            if (data.opt.features[i].attributes !== undefined) {
              feature.setProperties(data.opt.features[i].attributes);
            }
            options.features.push(feature);
          }
          catch(e) {
          }
        }
      }
    }
    return new ol.source.Vector(options);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Style:Circle',
  init: function(data) {
    return function (feature, resolution) {
      if (!(feature instanceof ol.Feature)) {
        return null;
      }
      var geometry = feature.getGeometry().getType();
      var geometry_style = data.opt[geometry] || data.opt['default'];

      return [
        new ol.style.Style({
          image: new ol.style.Circle({
            fill: new ol.style.Fill({
              color: 'rgba(' + geometry_style.image.fill.color + ')'
            }),
            stroke: new ol.style.Stroke({
              width: geometry_style.image.stroke.width,
              color: 'rgba(' + geometry_style.image.stroke.color + ')',
              lineDash: geometry_style.image.stroke.lineDash.split(',')
            }),
            radius: geometry_style.image.radius
          }),
          fill: new ol.style.Fill({
            color: 'rgba(' + geometry_style.fill.color + ')'
          }),
          stroke: new ol.style.Stroke({
            width: geometry_style.stroke.width,
            color: 'rgba(' + geometry_style.stroke.color + ')',
            lineDash: geometry_style.stroke.lineDash.split(',')
          })
        })
      ];
    };
  }
});
;
