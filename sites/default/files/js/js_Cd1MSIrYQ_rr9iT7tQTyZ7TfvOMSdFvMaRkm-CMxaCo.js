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
  fs: 'openlayers.Component:GeofieldWidget',
  init: function(data) {
    var map = data.map;

    // make interactions global so they can later be removed
    var select_interaction, draw_interaction,
      modify_interaction,snap_interaction,
      translate_interaction;

    var vector_layer;
    var geofieldControl;
    var geofieldWrapper = jQuery('#openlayers-geofield-' + jQuery(data.map.getViewport()).parent().attr('id'));

    // Select the related source or fallback to a generic one.
    if (data.opt.editLayer !== undefined && data.objects.layers[data.opt.editLayer] !== undefined) {
      vector_layer = data.objects.layers[data.opt.editLayer];
      vector_layer.getSource().on('change', saveData);
    }

    if (data.opt.editStyle !== undefined && data.objects.styles[data.opt.editStyle] !== undefined) {
      var editStyle = data.objects.styles[data.opt.editStyle];
    }

    if (data.opt.editControl !== undefined && data.objects.controls[data.opt.editControl] !== undefined) {
      geofieldControl = data.objects.controls[data.opt.editControl];

      geofieldControl.element.addEventListener('change', function(event) {
        var options = event.detail.options;
        removeMapInteractions();

        if ((((options || {}).actions || {}).Clear || false) === true) {
          clearMap();
        }

        if ((((options || {}).actions || {}).Move || false) === true) {
          addSelectInteraction();
          addTranslateInteraction();
        }

        if ((((options || {}).actions || {}).Edit || false) === true) {
          addSelectInteraction();
          addModifyInteraction();
        }

        if (((options || {}).draw || false) !== false) {
          addDrawInteraction(options.draw);
        }

        if ((((options || {}).options || {}).Snap || false) === true) {
          addSnapInteraction();
        }

        this.options = event.detail.options;
      });
    }

    var data_type = jQuery('.data-type', geofieldWrapper);
    data_type.change(function(e) {
      clearMap();
      removeMapInteractions();
    });

    function removeMapInteractions() {
      map.removeInteraction(select_interaction);
      map.removeInteraction(draw_interaction);
      map.removeInteraction(modify_interaction);
      map.removeInteraction(snap_interaction);
      map.removeInteraction(translate_interaction);
    }

    function clearMap() {
      vector_layer.getSource().clear();
      saveData();
    }

    function addTranslateInteraction() {
      translate_interaction = new ol.interaction.Translate({
        features: select_interaction.getFeatures()
      });
      map.addInteraction(translate_interaction);
    }

    function addSnapInteraction() {
      snap_interaction = new ol.interaction.Snap({
        source: vector_layer.getSource()
      });
      map.addInteraction(snap_interaction);
    }

    function addSelectInteraction() {
      select_interaction = new ol.interaction.Select({
        // make sure only the desired layer can be selected
        layers: function(layer) {
          return layer === vector_layer;
        }
      });
      map.addInteraction(select_interaction);
    }

    // build up modify interaction
    function addModifyInteraction() {
      // grab the features from the select interaction to use in the modify interaction
      var selected_features = select_interaction.getFeatures();
      // when a feature is selected...
      selected_features.on('add', function(event) {
        // grab the feature
        var feature = event.element;
        // ...listen for changes and save them
        feature.on('change', saveData);
        // listen to pressing of delete key, then delete selected features
        jQuery(document).on('keyup', function (event) {
          if (event.keyCode === 46) {
            try {
              // remove from select_interaction
              selected_features.remove(feature);
              // remove from vector_layer
              vector_layer.getSource().removeFeature(feature);
              // save the changed data
            } catch (e) {
              // No matter what happened - ensure the data are written.
            }
            saveData();
            // remove listener
            jQuery(document).off('keyup');
          }
        });
      });

      // create the modify interaction
      modify_interaction = new ol.interaction.Modify({
        style: editStyle,
        features: selected_features,
        // delete vertices by pressing the SHIFT key
        deleteCondition: function(event) {
          return ol.events.condition.shiftKeyOnly(event) &&
            ol.events.condition.singleClick(event);
        }
      });
      // add it to the map
      map.addInteraction(modify_interaction);
    }

    // creates a draw interaction
    function addDrawInteraction(options) {
      var geometryFunction, maxPoints;
      var value = options;

      if (value === 'Square') {
        value = 'Circle';
        maxPoints = 4;
        geometryFunction = ol.interaction.Draw.createRegularPolygon(4);
      } else if (value === 'Box') {
        value = 'LineString';
        maxPoints = 2;
        geometryFunction = function(coordinates, geometry) {
          if (!geometry) {
            geometry = new ol.geom.Polygon(null);
          }
          var start = coordinates[0];
          var end = coordinates[1];
          geometry.setCoordinates([
            [start, [start[0], end[1]], end, [end[0], start[1]], start]
          ]);
          return geometry;
        };
      } else if (value === 'Circle') {
        geometryFunction = ol.interaction.Draw.createRegularPolygon(100);
      } else if (value === 'Triangle') {
        value = 'Circle';
        maxPoints = 3;
        geometryFunction = ol.interaction.Draw.createRegularPolygon(3);
      }

      // create the interaction
      draw_interaction = new ol.interaction.Draw({
        source: vector_layer.getSource(),
        type: /** @type {ol.geom.GeometryType} */ (value),
        geometryFunction: geometryFunction,
        maxPoints: maxPoints,
        style: editStyle
      });

      // add it to the map
      map.addInteraction(draw_interaction);
    }

    // shows data in textarea
    // replace this function by what you need
    function saveData() {
      // get the format the user has chosen
      // define a format the data shall be converted to
      var typeFormat = data_type.val();
      var features = vector_layer.getSource().getFeatures();

      var format = new ol.format[typeFormat]({splitCollection: true}),
//      var format = new ol.format[typeFormat]({splitCollection: true}),
      // this will be the data in the chosen format
        datas;
      try {
        if (data.opt.featureLimit && data.opt.featureLimit != -1 && data.opt.featureLimit < features.length) {
          if (confirm(Drupal.t('You can add a maximum of !limit features. Dou you want to replace the last feature by the new one?', {'!limit': data.opt.featureLimit}))) {
            var lastFeature = features[features.length - 2];
            vector_layer.getSource().removeFeature(lastFeature);
          } else {
            var lastFeature = features[features.length - 1];
            vector_layer.getSource().removeFeature(lastFeature);
          }
        }

        // convert the data of the vector_layer into the chosen format
        datas = format.writeFeatures(vector_layer.getSource().getFeatures(), {
          dataProjection: data.opt.dataProjection,
          featureProjection: data.map.getView().getProjection()
        });

        // Ensure an empty geometry collection doesn't write any data. That way
        // the original geofield validator will work and a required field is
        // properly detected as empty.
        if (datas === 'GEOMETRYCOLLECTION EMPTY') {
          datas = '';
        }

      } catch (e) {
        // at time of creation there is an error in the GPX format (18.7.2014)
        jQuery('.openlayers-geofield-data', geofieldWrapper).val(e.name + ": " + e.message);
        return;
      }
      jQuery('.openlayers-geofield-data', geofieldWrapper).val(datas);
    }
  }
});

/**
 * Ensures the  map is fully rebuilt on ajax request - e.g. geocoder.
 * Ensures that opening a collapsed fieldset will refresh the map.
 */
Drupal.behaviors.openlayersGeofieldWidget = (function($) {
  "use strict";
  return {
    attach: function (context, settings) {
      $('fieldset:has(.openlayers-map)', context).bind('collapsed', function (e) {
        // If not collapsed update the size of the map. But wait a moment so the
        // animation is done already.
        var fieldset = this;
        if (!e.value) {
          window.setTimeout(function() {
            jQuery('.openlayers-map', fieldset).each(function (index, elem) {
              var map = Drupal.openlayers.getMapById(jQuery(elem).attr('id'));
              if (map && map.map !== undefined) {
                map.map.updateSize();
              }
            });
          }, 1000);
        }
      });
    }
  };
})(jQuery);
;
ol.control.Geofield = function(opt_options) {
  var options = opt_options || {};
  var className = options.className || 'ol-geofield';
  this.options = options;

  var this_ = this;
  var handleDrawClick_ = function(e) {
    this_.handleDrawClick_(e);
  };
  var handleActionsClick_ = function(e) {
    this_.handleActionsClick_(e);
  };
  var handleOptionsClick_ = function(e) {
    this_.handleOptionsClick_(e);
  };

  draw = options.draw || {};
  actions = options.actions || {};
  options = options.options || {};

  drawElements = new ol.Collection();
  actionsElements = new ol.Collection();
  optionsElements = new ol.Collection();

  if (draw.Point) {
    var pointLabel = options.pointLabel || '\u25CF';
    var pointTipLabel = options.pointTipLabel || 'Draw a point';
    var pointElement = document.createElement('button');
    pointElement.className = className + '-point';
    pointElement.type = 'button';
    pointElement.draw = 'Point';
    pointElement.title = pointTipLabel;
    pointElement.innerHTML = pointLabel;
    pointElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(pointElement);
  }

  if (draw.MultiPoint) {
    var multipointLabel = options.multipointLabel || '\u25CF';
    var multipointTipLabel = options.multipointTipLabel || 'Draw a multipoint';
    var multipointElement = document.createElement('button');
    multipointElement.className = className + '-multipoint';
    multipointElement.type = 'button';
    multipointElement.draw = 'MultiPoint';
    multipointElement.title = multipointTipLabel;
    multipointElement.innerHTML = multipointLabel;
    multipointElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(multipointElement);
  }

  if (draw.LineString) {
    var linestringLabel = options.pointLabel || '\u2500';
    var linestringTipLabel = options.pointTipLabel || 'Draw a linestring, hold [shift] for free hand.';
    var linestringElement = document.createElement('button');
    linestringElement.className = className + '-linestring';
    linestringElement.type = 'button';
    linestringElement.draw = 'LineString';
    linestringElement.title = linestringTipLabel;
    linestringElement.innerHTML = linestringLabel;
    linestringElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(linestringElement);
  }

  if (draw.MultiLineString) {
    var multilinestringLabel = options.pointLabel || '\u2500';
    var multilinestringTipLabel = options.pointTipLabel || 'Draw a multilinestring, hold [shift] for free hand.';
    var multilinestringElement = document.createElement('button');
    multilinestringElement.className = className + '-multilinestring';
    multilinestringElement.type = 'button';
    multilinestringElement.draw = 'MultiLineString';
    multilinestringElement.title = multilinestringTipLabel;
    multilinestringElement.innerHTML = multilinestringLabel;
    multilinestringElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(multilinestringElement);
  }

  if (draw.Triangle) {
    var triangleLabel = options.triangleLabel || '\u25B3';
    var triangleTipLabel = options.triangleTipLabel || 'Draw a triangle';
    var triangleElement = document.createElement('button');
    triangleElement.className = className + '-triangle';
    triangleElement.type = 'button';
    triangleElement.draw = 'Triangle';
    triangleElement.title = triangleTipLabel;
    triangleElement.innerHTML = triangleLabel;
    triangleElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(triangleElement);
  }

  if (draw.Square) {
    var squareLabel = options.squareLabel || '\u25FB';
    var squareTipLabel = options.squareTipLabel || 'Draw a square';
    var squareElement = document.createElement('button');
    squareElement.className = className + '-square';
    squareElement.type = 'button';
    squareElement.draw = 'Square';
    squareElement.title = squareTipLabel;
    squareElement.innerHTML = squareLabel;
    squareElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(squareElement);
  }

  if (draw.Box) {
    var boxLabel = options.boxLabel || '\u25AF';
    var boxTipLabel = options.boxTipLabel || 'Draw a box';
    var boxElement = document.createElement('button');
    boxElement.className = className + '-box';
    boxElement.type = 'button';
    boxElement.draw = 'Box';
    boxElement.title = boxTipLabel;
    boxElement.innerHTML = boxLabel;
    boxElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(boxElement);
  }

  if (draw.Circle) {
    var circleLabel = options.circleLabel || '\u25EF';
    var circleTipLabel = options.circleTipLabel || 'Draw a circle';
    var circleElement = document.createElement('button');
    circleElement.className = className + '-circle';
    circleElement.type = 'button';
    circleElement.draw = 'Circle';
    circleElement.title = circleTipLabel;
    circleElement.innerHTML = circleLabel;
    circleElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(circleElement);
  }

  if (draw.Polygon) {
    var polygonLabel = options.polygonLabel || '\u2B1F';
    var polygonTipLabel = options.polygonTipLabel || 'Draw a polygon';
    var polygonElement = document.createElement('button');
    polygonElement.className = className + '-polygon';
    polygonElement.type = 'button';
    polygonElement.draw = 'Polygon';
    polygonElement.title = polygonTipLabel;
    polygonElement.innerHTML = polygonLabel;
    polygonElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(polygonElement);
  }

  if (draw.MultiPolygon) {
    var multipolygonLabel = options.multipolygonLabel || '\u2B1F';
    var multipolygonTipLabel = options.multipolygonTipLabel || 'Draw a multipolygon';
    var multipolygonElement = document.createElement('button');
    multipolygonElement.className = className + '-multipolygon';
    multipolygonElement.type = 'button';
    multipolygonElement.draw = 'MultiPolygon';
    multipolygonElement.title = multipolygonTipLabel;
    multipolygonElement.innerHTML = multipolygonLabel;
    multipolygonElement.addEventListener('click', handleDrawClick_, false);
    drawElements.push(multipolygonElement);
  }

  if (actions.Edit) {
    var editLabel = options.editLabel || '\u270D';
    var editTipLabel = options.editTipLabel || 'Edit features';
    var editElement = document.createElement('button');
    editElement.className = className + '-edit';
    editElement.type = 'button';
    editElement.action = 'Edit';
    editElement.title = editTipLabel;
    editElement.innerHTML = editLabel;
    editElement.addEventListener('click', handleActionsClick_, false);
    actionsElements.push(editElement);
  }

  if (actions.Move) {
    var moveLabel = options.moveLabel || '\u27A4';
    var moveTipLabel = options.moveTipLabel || 'Move features';
    var moveElement = document.createElement('button');
    moveElement.className = className + '-move';
    moveElement.type = 'button';
    moveElement.action = 'Move';
    moveElement.title = moveTipLabel;
    moveElement.innerHTML = moveLabel;
    moveElement.addEventListener('click', handleActionsClick_, false);
    actionsElements.push(moveElement);
  }

  if (actions.Clear) {
    var clearLabel = options.clearLabel || 'X';
    var clearTipLabel = options.clearTipLabel || 'Clear features';
    var clearElement = document.createElement('button');
    clearElement.className = className + '-clear';
    clearElement.type = 'button';
    clearElement.action = 'Clear';
    clearElement.title = clearTipLabel;
    clearElement.innerHTML = clearLabel;
    clearElement.addEventListener('click', handleActionsClick_, false);
    actionsElements.push(clearElement);
  }

  if (options.Snap) {
    var snapLabel = options.snapLabel || '\u25CE';
    var snapTipLabel = options.snapTipLabel || 'Snap to features';
    var snapElement = document.createElement('button');
    snapElement.className = className + '-snap';
    snapElement.type = 'button';
    snapElement.option = 'Snap';
    snapElement.title = snapTipLabel;
    snapElement.innerHTML = snapLabel;
    snapElement.addEventListener('click', handleOptionsClick_, false);
    optionsElements.push(snapElement);
  }

  var cssClasses = className + ' ' + 'ol-control';

  var drawElement = document.createElement('div');
  drawElement.className = 'draw ol-control-group';
  drawElements.forEach(function(element) {
    drawElement.appendChild(element);
  });

  var actionsElement = document.createElement('div');
  actionsElement.className = 'actions ol-control-group';
  actionsElements.forEach(function(element) {
    actionsElement.appendChild(element);
  });

  var optionsElement = document.createElement('div');
  optionsElement.className = 'options ol-control-group';
  optionsElements.forEach(function(element) {
    optionsElement.appendChild(element);
  });

  var controlsElement = document.createElement('div');
  controlsElement.className = 'ol-geofield-controls';
  controlsElement.appendChild(drawElement);
  controlsElement.appendChild(actionsElement);
  controlsElement.appendChild(optionsElement);

  var element = document.createElement('div');
  element.className = cssClasses;
  element.appendChild(controlsElement);

  ol.control.Control.call(this, {
    element: element,
    target: options.target
  });
};
ol.inherits(ol.control.Geofield, ol.control.Control);

ol.control.Geofield.prototype.handleDrawClick_ = function(event) {
  var options = this.options;

  // Disable actions buttons.
  var divs = this.element.getElementsByClassName('actions')[0];
  [].map.call(divs.children, function(element) {
    element.classList.remove('enable');
  });
  delete options.actions;

  // Disable other draw buttons.
  divs = this.element.getElementsByClassName('draw')[0];
  [].map.call(divs.children, function(element) {
    element.classList.remove('enable');
  });
  event.target.classList.toggle('enable');

  if (event.target.classList.contains('enable')) {
    options.draw = event.target.draw;
  } else {
    options.draw = false;
  }

  this.options = options;
  this.element.dispatchEvent(new CustomEvent('change', {'detail': this }));
};

ol.control.Geofield.prototype.handleActionsClick_ = function(event) {
  var options = this.options;

  // Disable draw buttons.
  var divs = this.element.getElementsByClassName('draw')[0];
  [].map.call(divs.children, function(element) {
    element.classList.remove('enable');
  });
  options.draw = false;

  // Disable other draw buttons.
  divs = this.element.getElementsByClassName('actions')[0];
  [].map.call(divs.children, function(element) {
    if (event.target !== element) {
      element.classList.remove('enable');
    }
  });
  event.target.classList.toggle('enable');

  if (event.target.classList.contains('enable')) {
    options.actions = options.actions || {};
    options.actions[event.target.action] = true;
  } else {
    options.actions[event.target.action] = false;
  }

  this.options = options;
  this.element.dispatchEvent(new CustomEvent('change', {'detail': this }));
};

ol.control.Geofield.prototype.handleOptionsClick_ = function(event) {
  var options = this.options;
  event.target.classList.toggle('enable');

  if (event.target.classList.contains('enable')) {
    options.options = options.options || {};
    options.options[event.target.option] = true;
  } else {
    options.options[event.target.option] = false;
    event.target.blur();
  }

  this.options = options;
  this.element.dispatchEvent(new CustomEvent('change', {'detail': this }));
};
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Control:Geofield',
  init: function(data) {
    return new ol.control.Geofield(data.opt);
  }
});


;
