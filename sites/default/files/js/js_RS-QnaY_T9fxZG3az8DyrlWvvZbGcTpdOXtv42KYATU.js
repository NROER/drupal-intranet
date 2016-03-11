Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Interaction:DoubleClickZoom',
  init: function(data) {
    return new ol.interaction.DoubleClickZoom(data.opt);
  }
});
;
Drupal.openlayers.pluginManager.register({
  fs: 'openlayers.Source:TileWMS',
  init: function(data) {
    return new ol.source.TileWMS(data.opt);
  }
});
;
