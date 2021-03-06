L.Control.Locate = L.Control.extend({
    options: {
        position: 'topleft',
        drawCircle: true,
        follow: false,  // follow with zoom and pan the user's location
        stopFollowingOnEvents: null, // stop following when map events from this array are fired (if following)
        // range circle
        circleStyle: {
            color: '#136AEC',
            fillColor: '#136AEC',
            fillOpacity: 0.15,
            weight: 2,
            opacity: 0.5
        },
        // inner marker
        markerStyle: {
            color: '#136AEC',
            fillColor: '#2A93EE',
            fillOpacity: 0.7,
            weight: 2,
            opacity: 0.9,
            radius: 5
        },
        // changes to range circle and inner marker while following
        // it is only necessary to provide the things that should change
        followCircleStyle: {},
        followMarkerStyle: {
            //color: '#FFA500',
            //fillColor: '#FFB000'
        },
        metric: true,
        onLocationError: function (err) {
            // this event is called in case of any location error
            // that is not a time out error.
            alert(err.message);
        },
        onLocationOutsideMapBounds: function(context) {
            // this event is repeatedly called when the location changes
            alert(context.options.strings.outsideMapBoundsMsg);
        },
        setView: true, // automatically sets the map view to the user's location
        strings: {
            title: "Show me where I am",
            popup: "You are within {distance} {unit} from this point",
            outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
        },
        trackingOnStart: false, // Begin tracking immediately after initialization.
        locateOptions: {}
    },

    onAdd: function (map) {
        var className = 'leaflet-control-locate',
            classNames = className + ' leaflet-bar leaflet-control',
            container = L.DomUtil.create('div', classNames);

        var self = this;
        this._layer = new L.LayerGroup();
        this._layer.addTo(map);
        this._event = undefined;
        this._locationFound = false;

        this._locateOptions = {
            watch: true  // if you overwrite this, visualization cannot be updated
        };
        L.extend(this._locateOptions, this.options.locateOptions);
        L.extend(this._locateOptions, {
            setView: false // have to set this to false because we have to
                           // do setView manually
        });

        // extend the follow marker style and circle from the normal style
        var tmp = {};
        L.extend(tmp, this.options.markerStyle, this.options.followMarkerStyle);
        this.options.followMarkerStyle = tmp;
        tmp = {};
        L.extend(tmp, this.options.circleStyle, this.options.followCircleStyle);
        this.options.followCircleStyle = tmp;

        var link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', container);
        link.href = '#';
        link.title = this.options.strings.title;

        var toggleLocate = function () {
            if (self._active && (map.getBounds().contains(self._event.latlng) || !self.options.setView ||
                                 isOutsideMapBounds())) {
                stopLocate();
            } else {
                if (self.options.setView) {
                    self._locateOnNextLocationFound = true;
                }
                if (!self._active) {
                    map.locate(self._locateOptions);
                }
                self._active = true;
                if (self.options.follow) {
                    startFollowing();
                }
                if (!self._event) {
                    container.className = classNames + " requesting";
                } else {
                    visualizeLocation();
                }
            }
        };

        L.DomEvent
            .on(link, 'click', L.DomEvent.stopPropagation)
            .on(link, 'click', L.DomEvent.preventDefault)
            .on(link, 'click', toggleLocate)
            .on(link, 'dblclick', L.DomEvent.stopPropagation);

        var onLocationFound = function (e) {
            // no need to do anything if the location has not changed
            self._active = true;
            self._locationFound = true;

            if (self._event &&
                (self._event.latlng.lat === e.latlng.lat &&
                 self._event.latlng.lng === e.latlng.lng &&
                 self._event.accuracy === e.accuracy)) {
                return;
            }

            self._event = e;

            if (self.options.follow && self._following) {
                self._locateOnNextLocationFound = true;
            }

            visualizeLocation();
        };

        var startFollowing = function () {
            self._following = true;
            if (self.options.stopFollowingOnEvents) {
                _followingEventsOn();
            }
            self._currentStopFollowingOnEvents = self.options.stopFollowingOnEvents;
        };

        var stopFollowing = function () {
            self._following = false;
            if (self.options.stopFollowingOnEvents) {
                _followingEventsOff();
            }
            visualizeLocation();
        };
        
        var _followingEventsOn = function () {
        	if (self._currentStopFollowingOnEvents) {
        		if (self._currentStopFollowingOnEvents == self.options.stopFollowingOnEvents) {
        			return;
        		}
        		_followingEventsOff();
        	}
        	map.on(self.options.stopFollowingOnEvents.join(' '), stopFollowing);
        };
        
        var _followingEventsOff = function () {
        	if (self._currentStopFollowingOnEvents) {
        		map.off(self._currentStopFollowingOnEvents.join(' '), stopFollowing);
        	}
        	self._currentStopFollowingOnEvents = null;
        };

        var isOutsideMapBounds = function () {
            if (self._event === undefined)
                return false;
            return map.options.maxBounds &&
                !map.options.maxBounds.contains(self._event.latlng);
        };

        var visualizeLocation = function () {
            var radius;
            if (self._event.accuracy === undefined)
                radius = 0;
            else
                radius = self._event.accuracy / 2;

            self._layer.clearLayers();
            
            if (self._currentStopFollowingOnEvents &&
            	    (self._currentStopFollowingOnEvents != self.options.stopFollowingOnEvents)) {
            	_followingEventsOff();
            	map.on(self.options.stopFollowingOnEvents.join(' '), startFollowing);
           	}

            if (self._locateOnNextLocationFound) {
                if (isOutsideMapBounds()) {
                    self.options.onLocationOutsideMapBounds(self);
                } else {
                    map.fitBounds(self._event.bounds);
                }
                self._locateOnNextLocationFound = false;
            }

            // circle with the radius of the location's accuracy
            var style;
            if (self.options.drawCircle) {
                if (self._following) {
                    style = self.options.followCircleStyle;
                } else {
                    style = self.options.circleStyle;
                }

                L.circle(self._event.latlng, radius, style)
                    .addTo(self._layer);
            }

            var distance, unit;
            if (self.options.metric) {
                distance = radius.toFixed(0);
                unit = "meters";
            } else {
                distance = (radius * 3.2808399).toFixed(0);
                unit = "feet";
            }

            // small inner marker
            var m;
            if (self._following) {
                m = self.options.followMarkerStyle;
            } else {
                m = self.options.markerStyle;
            }

            var t = self.options.strings.popup;
            L.circleMarker(self._event.latlng, m)
                .bindPopup(L.Util.template(t, {distance: distance, unit: unit}))
                .addTo(self._layer);

            if (self._following) {
                container.className = classNames + " active following";
            } else {
                container.className = classNames + " active";
            }
        };

        var resetVariables = function () {
            self._active = false;
            self._locateOnNextLocationFound = self.options.setView;
            self._following = false;
            self._locationFound = false;
            self._currentStopFollowingOnEvents = null;
        };

        resetVariables();

        var stopLocate = function () {
            map.stopLocate();
            map.off('dragstart', stopFollowing);

            container.className = classNames;
            resetVariables();

            self._layer.clearLayers();
        };


        var onLocationError = function (err) {
            // ignore time out error if the location is watched
            if (err.code === 3 && self._locateOptions.watch && self._locationFound) {
                return;
            }

            stopLocate();
            self.options.onLocationError(err);
        };

        // event hooks
        map.on('locationfound', onLocationFound, self);
        map.on('locationerror', onLocationError, self);

        try {
            if (self.options.trackingOnStart) {
                toggleLocate();
            }
        } catch (e) {
        }

        return container;
    }
});

L.Map.addInitHook(function () {
    if (this.options.locateControl) {
        this.locateControl = L.control.locate();
        this.addControl(this.locateControl);
    }
});

L.control.locate = function (options) {
    return new L.Control.Locate(options);
};
