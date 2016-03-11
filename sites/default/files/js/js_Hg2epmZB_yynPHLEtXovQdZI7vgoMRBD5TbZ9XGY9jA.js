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
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Interaction:DragRotate',
  init: function(data) {
    return new ol.interaction.DragRotate(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Layer:Tile',
  init: function(data) {
    return new ol.layer.Tile(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Interaction:MouseWheelZoom',
  init: function(data) {
    return new ol.interaction.MouseWheelZoom(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Control:FullScreen',
  init: function(data) {
    return new ol.control.FullScreen(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Interaction:DragPan',
  init: function(data) {
    var kinetic = new ol.Kinetic(data.opt.decay, data.opt.minVelocity, data.opt.delay);
    return new ol.interaction.DragPan({kinetic: kinetic});
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Control:OverviewMap',
  init: function(data) {
    return new ol.control.OverviewMap();
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Control:Rotate',
  init: function(data) {
    return new ol.control.Rotate(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Control:Zoom',
  init: function(data) {
    return new ol.control.Zoom(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Control:Attribution',
  init: function(data) {
    return new ol.control.Attribution(data.opt);
  }
});
;
ol.control.Export = function(opt_options) {
  var options = opt_options || {};


  var this_ = this;
  var handleClick_ = function(e) {
    this_.handleClick_(e);
  };


  var exportTipLabel = options.exportTipLabel || '';

  var button = document.createElement('button');
  button.innerHTML = '\u2193';
  button.title = exportTipLabel;
  button.className = 'ol-export-export';
  button.type = 'button';
  button.download = 'map.png';

  var link = document.createElement('a');
  link.className = 'ol-hidden';

  var element = document.createElement('div');
  element.className = 'ol-export ol-unselectable ol-control';
  element.appendChild(link);
  element.appendChild(button);

  ol.control.Control.call(this, {
    element: element,
    target: options.target
  });

  button.addEventListener('click', handleClick_, false);
  this.options = options;
};
ol.inherits(ol.control.Export, ol.control.Control);

/**
 * @param {event} event Browser event.
 */
ol.control.Export.prototype.handleClick_ = function(event) {
  event.target.blur();
  var link = this.element.children[0];
  this.getMap().once('postcompose', function(event) {
    var canvas = event.context.canvas;
    link.download = 'map-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
  this.getMap().renderSync();
};
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Control:Export',
  init: function(data) {
    return new ol.control.Export(data.opt);
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
  fs: 'openlayers.Source:XYZ',
  init: function(data) {
    if (data.opt.crossOrigin !== undefined) {
      if (data.opt.crossOrigin === 'null') {
        data.opt.crossOrigin = null;
      }
    }
    return new ol.source.XYZ(data.opt);
  }
});
;
