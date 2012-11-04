var layer_OSM = new L.tileLayer(
    'http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',{
        attribution: '&copy <a href=" http://www.openstreetmap.org/" title="OpenStreetMap">OpenStreetMap</a>  and contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/" title="CC-BY-SA">CC-BY-SA</a>',
        maxZoom: 18,
        subdomains: 'abc'
    }
)

var map = new L.Map('map', {
    layers: [layer_OSM],
    center: new L.LatLng(51.505, -0.09),
    zoom: 10,
	zoomControl: true
});


L.control.locate().addTo(map);