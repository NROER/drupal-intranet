(function ($, Drupal) {

  "use strict";

  Drupal.openlayers = {
    instances: {},
    processMap: function (map_id, context) {
      var settings = $.extend({}, {
        layer: [],
        style: [],
        control: [],
        interaction: [],
        source: [],
        projection: [],
        component: []
      }, Drupal.settings.openlayers.maps[map_id]);
      var map = false;

      // If already processed just return the instance.
      if (Drupal.openlayers.instances[map_id] !== undefined) {
        return Drupal.openlayers.instances[map_id].map;
      }

      $(document).trigger('openlayers.build_start', [
        {
          'type': 'objects',
          'settings': settings,
          'context': context
        }
      ]);

      try {
        $(document).trigger('openlayers.map_pre_alter', [
          {
            context: context,
            settings: settings,
            map_id: map_id
          }
        ]);
        map = Drupal.openlayers.getObject(context, 'maps', settings.map, map_id);
        $(document).trigger('openlayers.map_post_alter', [{map: Drupal.openlayers.instances[map_id].map}]);

        if (settings.style.length > 0) {
          $(document).trigger('openlayers.styles_pre_alter', [
            {
              styles: settings.style,
              map_id: map_id
            }
          ]);
          settings.style.map(function (data) {
            Drupal.openlayers.getObject(context, 'styles', data, map_id);
          });
          $(document).trigger('openlayers.styles_post_alter', [
            {
              styles: settings.style,
              map_id: map_id
            }
          ]);
        }

        if (settings.source.length > 0) {
          $(document).trigger('openlayers.sources_pre_alter', [
            {
              sources: settings.source,
              map_id: map_id
            }
          ]);
          settings.source.map(function (data) {
            if (data.opt !== undefined && data.opt.attributions !== undefined) {
              data.opt.attributions = [
                new ol.Attribution({
                  'html': data.opt.attributions
                })
              ];
            }
            Drupal.openlayers.getObject(context, 'sources', data, map_id);
          });
          $(document).trigger('openlayers.sources_post_alter', [
            {
              sources: settings.source,
              map_id: map_id
            }
          ]);
        }

        if (settings.interaction.length > 0) {
          $(document).trigger('openlayers.interactions_pre_alter', [
            {
              interactions: settings.interaction,
              map_id: map_id
            }
          ]);
          settings.interaction.map(function (data) {
            var interaction = Drupal.openlayers.getObject(context, 'interactions', data, map_id);
            if (interaction) {
              map.addInteraction(interaction);
            }
          });
          $(document).trigger('openlayers.interactions_post_alter', [
            {
              interactions: settings.interaction,
              map_id: map_id
            }
          ]);
        }

        if (settings.layer.length > 0) {
          $(document).trigger('openlayers.layers_pre_alter', [
            {
              layers: settings.layer,
              map_id: map_id
            }
          ]);

          var groups = {};
          var layers = {};

          settings.layer.map(function (data, key) {
            if (data.fs === 'openlayers.Layer:Group') {
              groups[data.mn] = data;
            }
            else {
              layers[data.mn] = data;
            }
          });

          for (var i in layers) {
            var data = jQuery.extend(true, {}, layers[i]);
            data.opt.source = Drupal.openlayers.instances[map_id].sources[data.opt.source];
            if (data.opt.style !== undefined && Drupal.openlayers.instances[map_id].styles[data.opt.style] !== undefined) {
              data.opt.style = Drupal.openlayers.instances[map_id].styles[data.opt.style];
            }
            var layer = Drupal.openlayers.getObject(context, 'layers', data, map_id);

            if (layer) {
              if (data.opt.name !== undefined) {
                layer.set('title', data.opt.name);
              }
              layers[i] = layer;
            }
          }

          for (var i in groups) {
            data = jQuery.extend(true, {}, groups[i]);
            var candidates = [];
            data.opt.grouplayers.map(function (layer_machine_name) {
              candidates.push(layers[layer_machine_name]);
              delete layers[layer_machine_name];
            });
            data.opt.grouplayers = candidates;
            layer = Drupal.openlayers.getObject(context, 'layers', data, map_id);

            if (layer) {
              groups[i] = layer;
            }
          }

          $.map(layers, function (layer) {
            map.addLayer(layer);
          });

          // Todo: See why it's not ordered properly automatically.
          var groupsOrdered = [];
          for (var i in groups) {
            groupsOrdered.push(groups[i]);
          }
          groupsOrdered.reverse().map(function (layer) {
            map.addLayer(layer);
          });

          $(document).trigger('openlayers.layers_post_alter', [
            {
              layers: settings.layer,
              map_id: map_id
            }
          ]);
        }

        if (settings.control.length > 0) {
          $(document).trigger('openlayers.controls_pre_alter', [
            {
              controls: settings.control,
              map_id: map_id
            }
          ]);
          settings.control.map(function (data) {
            var control = Drupal.openlayers.getObject(context, 'controls', data, map_id);
            if (control) {
              map.addControl(control);
            }
          });
          $(document).trigger('openlayers.controls_post_alter', [
            {
              controls: settings.control,
              map_id: map_id
            }
          ]);
        }

        if (settings.component.length > 0) {
          $(document).trigger('openlayers.components_pre_alter', [{components: settings.component}]);
          settings.component.map(function (data) {
            Drupal.openlayers.getObject(context, 'components', data, map_id);
          });
        }

      } catch (e) {
        $('#' + map_id).empty();
        $(document).trigger('openlayers.build_failed', [
          {
            'error': e,
            'settings': settings,
            'context': context
          }
        ]);
        map = false;
      }

      $(document).trigger('openlayers.build_stop', [
        {
          'type': 'objects',
          'settings': settings,
          'context': context
        }
      ]);

      return map;
    },

    /**
     * Return the map instance collection of a map_id.
     *
     * @param map_id
     *   The id of the map.
     * @returns object/false
     *   The object or false if not instantiated yet.
     */
    getMapById: function (map_id) {
      if (Drupal.settings.openlayers.maps[map_id] !== undefined) {
        // Return map if it is instantiated already.
        if (Drupal.openlayers.instances[map_id]) {
          return Drupal.openlayers.instances[map_id];
        }
      }
      return false;
    },

    // Holds dynamic created asyncIsReady callbacks for every map id.
    // The functions are named by the cleaned map id. Everything besides 0-9a-z
    // is replaced by an underscore (_).
    asyncIsReadyCallbacks: {},
    asyncIsReady: function (map_id) {
      if (Drupal.settings.openlayers.maps[map_id] !== undefined) {
        Drupal.settings.openlayers.maps[map_id].map.opt.async--;
        if (!Drupal.settings.openlayers.maps[map_id].map.opt.async) {
          $('#' + map_id).once('openlayers-map', function () {
            Drupal.openlayers.processMap(map_id, document);
          });
        }
      }
    },

    /**
     * Get an object of a map.
     *
     * If it isn't instantiated yet the instance is created.
     */
    getObject: (function (context, type, data, map_id) {
      // If the type is maps the structure is slightly different.
      var instances_type = type;
      if (type == 'maps') {
        instances_type = 'map';
      }
      // Prepare instances cache.
      if (Drupal.openlayers.instances[map_id] === undefined) {
        Drupal.openlayers.instances[map_id] = {
          map: null,
          layers: {},
          styles: {},
          controls: {},
          interactions: {},
          sources: {},
          projections: {},
          components: {}
        };
      }

      // Check if we've already an instance of this object for this map.
      if (Drupal.openlayers.instances[map_id] !== undefined && Drupal.openlayers.instances[map_id][instances_type] !== undefined) {
        if (instances_type !== 'map' && Drupal.openlayers.instances[map_id][instances_type][data.mn] !== undefined) {
          return Drupal.openlayers.instances[map_id][instances_type][data.mn];
        }
        else
          if (instances_type === 'map' && Drupal.openlayers.instances[map_id][instances_type]) {
            return Drupal.openlayers.instances[map_id][instances_type];
          }
      }

      var object = null;
      // Make sure that data.opt exist even if it's empty.
      data.opt = $.extend({}, {}, data.opt);
      if (Drupal.openlayers.pluginManager.isRegistered(data['fs'])) {
        $(document).trigger('openlayers.object_pre_alter', [
          {
            'type': type,
            'mn': data.mn,
            'data': data,
            'map': Drupal.openlayers.instances[map_id].map,
            'objects': Drupal.openlayers.instances[map_id],
            'context': context,
            'map_id': map_id
          }
        ]);
        object = Drupal.openlayers.pluginManager.createInstance(data['fs'], {
          'data': data,
          'opt': data.opt,
          'map': Drupal.openlayers.instances[map_id].map,
          'objects': Drupal.openlayers.instances[map_id],
          'context': context,
          'map_id': map_id
        });
        $(document).trigger('openlayers.object_post_alter', [
          {
            'type': type,
            'mn': data.mn,
            'data': data,
            'map': Drupal.openlayers.instances[map_id].map,
            'objects': Drupal.openlayers.instances[map_id],
            'context': context,
            'object': object,
            'map_id': map_id
          }
        ]);

        // Store object to the instances cache.
        if (type == 'maps') {
          Drupal.openlayers.instances[map_id][instances_type] = object;
        }
        else {
          Drupal.openlayers.instances[map_id][instances_type][data.mn] = object;
        }
        return object;
      }
      else {
        $(document).trigger('openlayers.object_error', [
          {
            'type': type,
            'mn': data.mn,
            'data': data,
            'map': Drupal.openlayers.instances[map_id].map,
            'objects': Drupal.openlayers.instances[map_id],
            'context': context,
            'object': object,
            'map_id': map_id
          }
        ]);
      }
    }),
    log: function (string) {
      if (Drupal.openlayers.console !== undefined) {
        Drupal.openlayers.console.log(string);
      }
    }
};
}(jQuery, Drupal));
;
(function ($, Drupal) {

  "use strict";

  var plugins = [];

  Drupal.openlayers.pluginManager = {
    attach: function (context, settings) {
      for (var i in plugins) {
        var plugin = plugins[i];
        if (typeof plugin.attach === 'function') {
          plugin.attach(context, settings);
        }
      }
    },
    detach: function (context, settings) {
      for (var i in plugins) {
        var plugin = plugins[i];
        if (typeof plugin.detach === 'function') {
          plugin.detach(context, settings);
        }
      }
    },
    alter: function () {
      // @todo: alter hook
    },
    getPlugin: function (factoryService) {
      if (this.isRegistered(factoryService)) {
        return plugins[factoryService];
      }
      return false;
    },
    getPlugins: function () {
      return Object.keys(plugins);
    },
    register: function (plugin) {
      if ((typeof plugin !== 'object') || (plugin === null)) {
        return false;
      }

      if (typeof plugin.init !== 'function') {
        return false;
      }

      if (!plugin.hasOwnProperty('fs')) {
        return false;
      }

      plugins[plugin.fs] = plugin;
    },
    createInstance: function (factoryService, data) {
      if (!this.isRegistered(factoryService)) {
        return false;
      }

      try {
        var obj = plugins[factoryService].init(data);
      } catch (e) {
        if (console !== undefined) {
          Drupal.openlayers.console.log(e.message);
          Drupal.openlayers.console.log(e.stack);
        }
        else {
          $(this).text('Error during map rendering: ' + e.message);
          $(this).text('Stack: ' + e.stack);
        }
      }

      var objType = typeof obj;
      if ((objType === 'object') && (objType !== null) || (objType === 'function')) {
        obj.mn = data.data.mn;
        return obj;
      }

      return false;
    },
    isRegistered: function (factoryService) {
      return (factoryService in plugins);
    }
  };

}(jQuery, Drupal));
;
(function ($, Drupal) {

  "use strict";

  Drupal.behaviors.openlayers = {
      attach: function (context, settings) {
        Drupal.openlayers.pluginManager.attach(context, settings);

        $('.openlayers-map:not(.asynchronous)', context).once('openlayers-map', function () {
          var map_id = $(this).attr('id');
          if (Drupal.settings.openlayers.maps[map_id] !== undefined) {
            Drupal.openlayers.processMap(map_id, context);
          }
        });

        // Create dynamic callback functions for asynchronous maps.
        $('.openlayers-map.asynchronous', context).once('openlayers-map.asynchronous', function () {
          var map_id = $(this).attr('id');
          if (Drupal.settings.openlayers.maps[map_id] !== undefined) {
            Drupal.openlayers.asyncIsReadyCallbacks[map_id.replace(/[^0-9a-z]/gi, '_')] = function () {
              Drupal.openlayers.asyncIsReady(map_id);
            };
          }
        });
      },
      detach: function (context, settings) {
        Drupal.openlayers.pluginManager.detach(context, settings);
      }
  };
}(jQuery, Drupal));
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Style:Cluster',
  init: function(data) {
    var styleCache = {};
    var clusterStyle = function(feature, resolution) {
      var features = feature.get('features');
      if (features.length !== undefined) {
        var size = features.length;
        var style = styleCache[size];
        if (!style) {
          style = [new ol.style.Style({
            image: new ol.style.Circle({
              radius: 10,
              stroke: new ol.style.Stroke({
                color: '#fff'
              }),
              fill: new ol.style.Fill({
                color: '#3399CC'
              })
            }),
            text: new ol.style.Text({
              text: size.toString(),
              fill: new ol.style.Fill({
                color: '#fff'
              })
            })
          })];
          styleCache[size] = style;
        }
      }
      return style;
    };
    return clusterStyle;
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Style:Icon',
  init: function(data) {
    return new ol.style.Style({
      image: new ol.style.Icon(({
        scale: data.opt.scale,
        anchor: data.opt.anchor,
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: data.opt.path
      }))
    });
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Style:Timezones',
  init: function(data) {
    return function(feature, resolution) {
      var offset = 0;
      var name = feature.get('name'); // e.g. GMT -08:30
      var match = name.match(/([\-+]\d{2}):(\d{2})$/);
      if (match) {
        var hours = parseInt(match[1], 10);
        var minutes = parseInt(match[2], 10);
        offset = 60 * hours + minutes;
      }
      var date = new Date();
      var local = new Date(date.getTime() +
        (date.getTimezoneOffset() + offset) * 60000);
      // offset from local noon (in hours)
      var delta = Math.abs(12 - local.getHours() + (local.getMinutes() / 60));
      if (delta > 12) {
        delta = 24 - delta;
      }
      var opacity = 0.75 * (1 - delta / 12);
      return [new ol.style.Style({
        fill: new ol.style.Fill({
          color: [0xff, 0xff, 0x33, opacity]
        }),
        stroke: new ol.style.Stroke({
          color: '#ffffff'
        })
      })];
    };
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Style:RegularShape',
  init: function(data) {
    return function (feature, resolution) {
      if (!(feature instanceof ol.Feature)) {
        return null;
      }
      var geometry = feature.getGeometry().getType();
      var geometry_style = data.opt[geometry] || data.opt['default'];

      var options = {
        fill: new ol.style.Fill({
          color: 'rgba(' + geometry_style.image.fill.color + ')'
        }),
        stroke: new ol.style.Stroke({
          width: geometry_style.image.stroke.width,
          color: 'rgba(' + geometry_style.image.stroke.color + ')',
          lineDash: geometry_style.image.stroke.lineDash.split(',')
        })
      };

      if (geometry_style.image.radius !== undefined) {
        options.radius = geometry_style.image.radius;
      }
      if (geometry_style.image.points !== undefined) {
        options.points = geometry_style.image.points;
      }
      if (geometry_style.image.radius1 !== undefined) {
        options.radius1 = geometry_style.image.radius1;
      }
      if (geometry_style.image.radius2 !== undefined) {
        options.radius2 = geometry_style.image.radius2;
      }
      if (geometry_style.image.angle !== undefined) {
        options.angle = geometry_style.image.angle * Math.PI / 180;
      }
      if (geometry_style.image.rotation !== undefined) {
        options.rotation = geometry_style.image.rotation * Math.PI / 180;
      }
      return [
        new ol.style.Style({
          image: new ol.style.RegularShape(options),
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
  fs: 'openlayers.Style:Invisible',
  init: function(data) {
    return [
      new ol.style.Style()
    ];
  }
});
;
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
  fs: 'openlayers.Map:OLMap',
  init: function(data) {
    var options = jQuery.extend(true, {}, data.opt);
    var projection = ol.proj.get('EPSG:3857');
    var coord = ol.proj.transform([options.view.center.lat, options.view.center.lon], 'EPSG:4326', projection);

    var view_opts = {
      center: coord,
      rotation: options.view.rotation * (Math.PI / 180),
      zoom: options.view.zoom,
      projection: projection
    };

    if (options.view.limit_extent) {
      if (options.view.limit_extent == 'custom') {
        // Check if a extent boundaries are set.
        if (options.view.extent) {
          view_opts.extent = ol.proj.transform(options.view.extent.replace(/\s*/ig, '').split(','), 'EPSG:4326', projection);
        }
      }
      if (options.view.limit_extent == 'projection') {
        view_opts.extent = projection.getExtent();
      }
    }

    // Just use min / max zoom if set to a non 0 value to avoid problems.
    if (options.view.minZoom) {
      view_opts.minZoom = options.view.minZoom;
    }
    if (options.view.maxZoom) {
      view_opts.maxZoom = options.view.maxZoom;
    }

    options.view = new ol.View(view_opts);

    // Provide empty defaults to suppress Openlayers defaults that contains
    // all interactions and controls available.
    options.interactions = [];
    options.controls = [];
    options.target = data.opt.target;

    return new ol.Map(options);
  },
  detach: function (context, settings) {
    jQuery('.openlayers-map').removeOnce('openlayers-map', function () {
      var map_id = jQuery(this).attr('id');
      delete Drupal.openlayers.instances[map_id];
    });
  },
  attach: function(context, settings) {}
});
;
var openlayers_source_internal_geojson = {
  fs: 'openlayers.Source:GeoJSON',
  init: function(data) {
    data.opt.format = new ol.format.GeoJSON();

    //// If GeoJSON data is provided with the layer, use that.  Otherwise
    //// check if BBOX, then finally use AJAX method.
    if (data.opt.geojson_data) {
      data.opt.features = data.opt.format.readFeatures(data.opt.geojson_data, {featureProjection: data.map.getView().getProjection()});
      return new ol.source.Vector(data.opt);
    }
    else {
      if (data.opt.useBBOX) {
        data.opt.strategy = ol.loadingstrategy.bbox;
        data.opt.loader = this.getBboxLoader(data);
      }
    }

    // If reloading the features on state change is enabled we abuse the
    // strategy callback to implement a forced reload of features. This is
    // necessary since we can't overload the loadFeatures() function from the
    // source - it is not part of the API and thus isn't available in the
    // compiled version of ol.
    if ( (data.opt.reloadOnZoomChange !== undefined && data.opt.reloadOnZoomChange) || (data.opt.reloadOnExtentChange !== undefined && data.opt.reloadOnExtentChange) ) {
      data.opt.strategy = function (extent, resolution) {
        // If reloading the features is forced load them here. Otherwise just
        // return the extent of the standard loading strategy.
        if (this._forceReloadFeatures) {
          this._loadingFeatures = true;
          var projection = (this.getProjection()) ? this.getProjection() : data.map.getView().getProjection();
          data.opt.loader.call(this, extent, resolution, projection);
          // This has to be enabled / disabled before each loadFeatures
          // call.
          this._forceReloadFeatures = false;
          // Return an empty list - so the original loader is skipped.
          return [];
        }
        else {
          return ol.loadingstrategy.all;
        }
      };
    }

    var vectorSource = new ol.source.Vector(data.opt);
    this.configureVectorSource(vectorSource, data);
    return vectorSource;
  },

  /**
   * In some cases we need to adjust the load features handler.
   */
  configureVectorSource: function(vectorSource, data) {
    // @todo Add more strategies. Paging strategy would be really interesting
    //   to use with views_geojson.
    if (data.opt.useBBOX) {
      vectorSource._clearFeaturesOnLoad = false;
      vectorSource._loadingFeatures = false;

      if (data.opt.reloadOnExtentChange !== undefined) {
        vectorSource._clearFeaturesOnLoad = true;
        data.map.getView().on('change:center', function() {
          if (!vectorSource._loadingFeatures) {
            vectorSource._forceReloadFeatures = true;
          }
        });
      }
      if (data.opt.reloadOnZoomChange !== undefined) {
        vectorSource._clearFeaturesOnLoad = true;
        data.map.getView().on('change:resolution', function() {
          if (!vectorSource._loadingFeatures) {
            vectorSource._forceReloadFeatures = true;
          }
        });
      }
    }
    //else {
    //  // Fixed strategy.
    //  // @see http://dev.ol.org/releases/Openlayers-2.12/doc/apidocs/files/Openlayers/Strategy/Fixed-js.html
    //  if (data.opt.preload) {
    //    data.opt.strategies = [new ol.Strategy.Fixed({preload: true})];
    //  }
    //  else {
    //    data.opt.strategies = [new ol.Strategy.Fixed()];
    //  }
    //}
    //  if(data.opt.useScript){
    //    //use Script protocol to get around xss issues and 405 error
    //    data.opt.protocol = new ol.Protocol.Script({
    //      url: data.opt.url,
    //      callbackKey: data.opt.callbackKey,
    //      callbackPrefix: "callback:",
    //      filterToParams: function(filter, params) {
    //        // example to demonstrate BBOX serialization
    //        if (filter.type === ol.Filter.Spatial.BBOX) {
    //          params.bbox = filter.value.toArray();
    //          if (filter.projection) {
    //            params.bbox.push(filter.projection.getCode());
    //          }
    //        }
    //        return params;
    //      }
    //    });
    //  }
    //  else{
    //    data.opt.protocol = new ol.Protocol.HTTP({
    //      url: data.opt.url,
    //      format: new ol.Format.GeoJSON()
    //    });
    //  }
    //  var layer = new ol.Layer.Vector(title, options);
  },

  getBboxLoader: function(data) {
    return function(extent, resolution, projection) {
      // Ensure the bbox values are in the correct projection.
      var bbox = ol.proj.transformExtent(extent, data.map.getView().getProjection(), 'EPSG:4326');


      // Check if parameter forwarding is enabled.
      var params = {};
      if (data.opt.paramForwarding) {
        var get_params = location.search.substring(location.search.indexOf('?') + 1 ).split('&');
        jQuery.each(get_params, function(i, val){
          if (val.length) {
            var param = val.split('=');
            // Decode as these are encoded again. Manually handle + as this
            // isn't handled by decodeURIComponent.
            params[decodeURIComponent(param[0])] = (param[1] !== undefined) ? decodeURIComponent(param[1].replace(/\+/g, ' ')) : '';
          }
        })
      }
      params.bbox = bbox.join(',');
      params.zoom = data.map.getView().getZoom();

      var url = data.opt.url;
      jQuery(document).trigger('openlayers.bbox_pre_loading', [{'url': url, 'params': params, 'data':  data}]);

      var that = this;
      jQuery.ajax({
        url: url,
        data: params,
        success: function(data) {
          // If the _clearFeaturesOnLoad flag is set remove the current
          // features before adding the new ones.
          if (that._clearFeaturesOnLoad !== undefined) {
            // Clear features in this extent. We can't use that.clear()
            // because this causes some strange trouble afterwards. And we
            // can't use that.forEachFeature() or
            // that.forEachFeatureInExtent() because those functions won't
            // work with that.removeFeature().
            var features = that.getFeaturesInExtent(extent);
            jQuery(features).each(function (i, f) {
              that.removeFeature(f);
            });
          }
          var format = new ol.format.GeoJSON();
          var features = format.readFeatures(data, {featureProjection: projection});
          that.addFeatures(features);
          that._loadingFeatures = false;
        }
      });
    }
  }
};

Drupal.openlayers.pluginManager.register(openlayers_source_internal_geojson);
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
