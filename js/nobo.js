// thanks for looking at my code!
//
// you may reproduce, edit, adapt any of the code i wrote
//
// peace be with you,
// -david


// after certain zoom leve, no restricted extent!!
window.onload = function() { 
		// super fancy fade-in to loading page
		document.body.className = "loaded";
		// wait until transition finished and then begin...
		setTimeout(function(){page.init(style);}, 500);
};

var aerial = ["http://otile1.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg",
			  "http://otile2.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg",
			  "http://otile3.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg",
			  "http://otile4.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg"];

var resolutions = [156543.03390625, 78271.516953125, 39135.7584765625, 19567.87923828125, 9783.939619140625, 4891.9698095703125, 2445.9849047851562, 1222.9924523925781, 611.4962261962891, 305.74811309814453, 152.87405654907226, 76.43702827453613, 38.218514137268066, 19.109257068634033, 9.554628534317017, 4.777314267158508];

var months = ["january", "febuary", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

var geographic = new OpenLayers.Projection('EPSG:4326');
var mercator = new OpenLayers.Projection('EPSG:900913');

var geojson_format = new OpenLayers.Format.GeoJSON({
		'internalProjection': mercator,
		'externalProjection': geographic
	});

var katahdin = [4113554.3276513233, -9372314.09468909];
var springer = [5765035.181866605, -7672281.15949946];

var katahdin_lon = [36.95268, -64.08866];
var springer_lon = [51.78819, -56.56776];

var style = 
{
	bounds_padding: 300000,
	bounds_pct: 19,
	fadein_sec: 50,
	
	geojson_files : ["at_centerline", "at_states", "waypoints"],

	images: [
			 "style/terminus.png",
			 ],
	at_states: {
		fillColor: "transparent",
		fillOpacity: "0.2",
		strokeColor: "#ffffff",
		strokeOpacity: "0.2",
		strokeWidth: ".8"
	},
	waypoints: {
		default: {
				fillColor: "#ffffff",
				fillOpacity: "1",
				strokeColor: "#000000",
				strokeOpacity: "1",
				strokeWidth: "1.1", 
				pointRadius: "5.9",
				graphicName: "triangle",

				fontFamily: "ambitsek, sans-serif",
				fontSize: "8px",
				fontColor: "#ffffff",
				labelAlign: "lm",
				labelXOffset: 8,
				labelYOffset: 0,
				labelOutlineWidth: 2,
				labelOutlineColor: "#000000",
				cursor: "pointer",

				//fillColor: "#000000",
				//strokeColor: "#ffffff",
				label: "${timeAgo}",
		},
		hover: {
			fillColor: "#000000",
			strokeColor: "#ffffff",
			label: "${dist} mi.",
		},
		select: {
			fillColor: "#000000",
			strokeColor: "#ffffff",
			label: "${name}\nnear ${civ_city}, ${civ_state}"
		}
	},
	terminus: {
	default: {
			fill: false,
			externalGraphic: "style/terminus.png",
			graphicWidth: 10,
			graphicHeight: 10,

			fontFamily: "ambitsek, sans-serif",
			fontSize: "8px",
			fontColor: "#ffffff",
			labelAlign: "lm",
			labelXOffset: 8,
			labelYOffset: 0,
			labelOutlineWidth: 2,
			labelOutlineColor: "#000000",
			cursor: "pointer",
			label: "${mtn}"
	},
	hover: {
			label: "${dist} mi"
	},
	select: {
			label: "${pos}: ${time}"
	},
		
	},
	cur_waypoint: {
	default: {
			fillColor: "red",
			fillOpacity: "1",
			pointRadius: "4",
			strokeColor: "red",
			strokeWidth: "1",
			graphicName: "x",

			fontFamily: "ambitsek, sans-serif",
			fontSize: "8px",
			fontColor: "#ffffff",
			labelAlign: "lm",
			labelXOffset: 8,
			labelYOffset: 0,
			labelOutlineWidth: 2,
			labelOutlineColor: "#000000",
			cursor: "pointer",

			label: "${timeAgo}"
	},
	hover: {
			fillColor: "red",
			strokeWidth: "1.5",
			label: "${dist} mi",

			pointRadius: "5"
	},
	select: {
			pointRadius: "5",
			labelAlign: "lm",
			//label: "Last Seen ${timeAgo}:\n\n${name}\n${civ_dist} mi from ${civ_city}, ${civ_state}"

			label: "${name}\nnear ${civ_city}, ${civ_state}"
			
	} 
	},
	mq_options: {
		transitionEffect: 'resize'
	}
};

var cw_rules = new OpenLayers.Rule({
		filter: new OpenLayers.Filter.FeatureId({fids: [0]}),
		symbolizer: new OpenLayers.StyleMap(style)
	});

// test page for internet explorer, error if there is
// 
// add error handling on bad geojson
// load page and then call for openlayers.js

var page = 
{
	init : function(style)
	{
		// bind event listeners

		// sorry IE folks
		if ( window.navigator.appName.indexOf("Internet Explorer") > -1 )
			return document.getElementById("ie_msg").style.display = "table";

		$("menu").addEventListener("click", function(e){ page.menu_clicked(e.target); }, false);
		$("p_stamp").addEventListener("click", function(){ page.send_postcard(this); }, false);
		$("map").addEventListener("click", function(){ page.menu_clicked(null); }, false);
		$("close_popup").addEventListener("click", function(){ $("popup").className = "hidden" }, false);
		$("updates_submit").addEventListener("click", function(){ page.updates_signup(); }, false);

		popup_msg("images", true);

		this.style = style;
		this.fades = {};
		this.preload_imgs(style.images, page.imgs_loaded);
	},
	preload_imgs : function(imgs, callback) // based off of imgproload by eike send 
	{
		"use strict";

		var loaded = 0;
		var img = [];
		var inc = function() {
			loaded += 1;
			
			if ( loaded === imgs.length && callback )
				callback (img);
		};

		for ( var i=0; i<imgs.length; i++ )
			{
				img[i] = new Image();
				img[i].onload = inc;
				img[i].onabort = inc;
				img[i].onerror = inc;
				img[i].src = imgs[i];
			}
	},
	imgs_loaded : function(imgs)
	{
		// check to see if imgs were actually loaded
		for ( var i=0; i<imgs.length; i++ )
			{
				if ( !imgs[i].complete || imgs[i].naturalWidth == 0 ) 
					 return alert("couldn't load img: " + imgs[i].src);
				else if ( imgs[i].src.indexOf("bg") !== -1 )
					document.body.style.backgroundImage = "url('" + imgs[i].src + "')";
			}

		nobo.map_init(page.style);
	},
	menu_clicked: function(el)
	{
		var id = ( el == null ) ? "" : el.getAttribute("id").substring(2);
		var menu_opts = ["postcard", "updates", "good_ppl"];

		if ( el == null )
			popup_msg("", false, true);

		for (var i=0; i<menu_opts.length; i++)
			$(menu_opts[i]).style.display = ( el == null ? "none" : ( (menu_opts[i] == id) ? ($(id).style.display=="block" ? "none" : "block") : "none" ));
			

		// must blue focus on any text fields if they are not displayed so keyboarddefaults works currectly
		if (id == "postcard")
			$("p_text").focus();
		else if (id == "updates")
			$("updates_email").focus();
		else {
			$("updates_email").blur();
			$("p_text").blur();
		}
	},
	send_postcard : function(el)
	{
		OpenLayers.Request.POST({
				url: "ajax.php",
				data: OpenLayers.Util.getParameterString({p_msg: $("p_text").value}),
				headers: {
					"Content-type": "application/x-www-form-urlencoded"
				},
				callback: function(req) {
					var response = JSON.parse(req.responseText);
					
					if ( typeof response !== "object" )
						return popup_msg("An unknown error ocurred", false);
					else if ( typeof response.error !== "undefined" )
						return popup_msg("Error: " + response.error, false);
					else {
						el.parentNode.className = el.parentNode.className + " sent";
						setTimeout(function(){
								$("postcard").style.display = "none";
								$("postcard").className = "content";
								popup_msg("Thanks for sending me a message! I am sure I will love to read it and I promise to respond! Much Love. -D", false);
							}, 1200);
					}
				}});

	},
	updates_signup : function()
	{
		OpenLayers.Request.POST({
				url: "ajax.php",
				data: OpenLayers.Util.getParameterString({u_email: $("updates_email").value}),
				headers: {
					"Content-type": "application/x-www-form-urlencoded"
				},
				callback: function(req) {
					var response = JSON.parse(req.responseText);
					
					if ( typeof response !== "object" )
						return popup_msg("An unknown error ocurred", false);
					else if ( typeof response.error !== "undefined" )
						return popup_msg("Error: " + response.error, false);
					else if ( typeof response.msg !== "undefined" )
						popup_msg(response.msg, false);

					$("updates_info").innerHTML = "<div>" + $("updates_email").value + "</div>";
				}});
	}
}

var nobo = 
{
	map_init : function(style)
	{
		// set style
		this.style = style;

		// define event listeners
		OpenLayers.Request.events.on({ complete: nobo.request_loaded });

		// initialize map
		this.map = new OpenLayers.Map({
				displayProjection: geographic,
				projection: mercator,
				zoom: 7,
				theme: null,
				eventListeners: {
					"addlayer": nobo.layer_added,
					"zoomstart" : nobo.zoom_changed
				},
				controls: [new OpenLayers.Control.Zoom({
								   zoomInId: "zoom_in",
								   zoomOutId: "zoom_out"
						}),
					new OpenLayers.Control.Navigation({
							dragPanOptions: { enableKinetic: true }
						}),
					new OpenLayers.Control.KeyboardDefaults({
							badElements: ["updates_email", "p_text"]
						}),
					new OpenLayers.Control.ScaleBar({
							div: $("scalebar"),
							subdivisions: 4,
							displaySystem: "english",
						}),
					new OpenLayers.Control.MousePosition({
							element: $("coords"),
							numDigits: 2,
							prefix: "Lon: ",
							separator: "<br/>Lat: "
						})]
			});

		this.map.render("map");

		// restrict user zoom levels
		// thanks to Jonathan & stackoverflow for this (question 4240610)
		this.map.isValidZoomLevel = function(zoomLevel) {
			return ( (zoomLevel != null) && ( zoomLevel > 0 ) && (zoomLevel <= 8) );
		}

		// start & end dates
		this.startend = ["undefined", "undefined"];

		// start geojson load

		this.geojson_loaded = 0;
		popup_msg("gis data", true);

		for (var i=0; i<style.geojson_files.length; i++)
			OpenLayers.Request.GET({ url: "geojson/" + style.geojson_files[i] + ".geojson" });
	},
	request_loaded : function(layer)
	{
		var file = layer.requestUrl.split(".");

		if ( typeof layer.request === "undefined" || layer.request.status !== 200 )
			return false; // request failed or somethin else happened...

		if (file[file.length-1] == "geojson") // if req is geojson
			{
				var name = file[0].split("/")[1];
				var new_layer =  new OpenLayers.Layer.Vector(name, {
						strategy: [new OpenLayers.Strategy.Fixed({preload: true})],
						projection: mercator,
						styleMap: new OpenLayers.StyleMap(nobo.style[name])
					});

				new_layer.addFeatures(geojson_format.read(layer.request.responseText));

				nobo.map.addLayer(new_layer);
				new_layer.div.style.opacity = 0; // hide the layer on default
			}
	},
	layer_added : function(obj)
	{
		if ( nobo.style.geojson_files.indexOf(obj.layer.name) !== -1 ) // if layer added is geojson
			{
				obj.layer.div.className = obj.layer.div.className + " loaded";
				nobo.geojson_loaded++;
				nobo[obj.layer.name] = obj.layer;

				if (obj.layer.features.length > 0) // only if there are features
					{
						// if geojson has waypoints, let's get the current waypoint
						if (obj.layer.name == "waypoints")			
							{
								// remove the waypoints that were reported at the start & end of trail...
								for(var i=0; i<obj.layer.features.length; i++)
									{
										var dist = parseFloat(obj.layer.features[i].data.dist);

										if ( dist == 0.0 || dist == 2185.9 )								 
											{
												var time = new Date(obj.layer.features[i].data.time.replace(/-/g, "/"));

												nobo.startend[ (dist == 0.0 ? 0 : 1) ] = months[time.getMonth()] + " " + time.getDate();
												obj.layer.removeFeatures(obj.layer.features[i]);	
										
												i--; // idk but it makes it work
											}
									}

								nobo.current_waypoint = obj.layer.features[0];
								obj.layer.removeFeatures(obj.layer.features[0]); // take out current waypoint from past_waypoints

							}
						else if (obj.layer.name == "at_states")
							{
								nobo.delaware = obj.layer.features[10];						
							}
					}

				if (nobo.geojson_loaded == nobo.style.geojson_files.length)
					nobo.render_map();
			}
	},
	render_map : function()
	{
		// add blank base layer thanks to R.K @ gis.stackoverflow.com
		this.map.addLayer(new OpenLayers.Layer("", {isBaseLayer: true}));

		// create terminus icons
		this.terminus = new OpenLayers.Layer.Vector("terminus", {styleMap: new OpenLayers.StyleMap(nobo.style.terminus)});
		this.katahdin = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(katahdin[1], katahdin[0]), {mtn: "Springer Mountain", pos: "Start", align:"lr", time: nobo.startend[0], dist: 0.0});
		this.springer = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(springer[1], springer[0]), {mtn: "Mount Katahdin", pos: "End", time: nobo.startend[1], dist: 2185.9});
		this.terminus.addFeatures([this.katahdin, this.springer]);
		this.map.addLayer(this.terminus);

		//make terminus label be considered as dynamic
		this.terminus.styleMap.styles.default.propertyStyles.label = true;

		// create current waypoint layer
		this.cur_waypoint = new OpenLayers.Layer.Vector("cur_waypoint", {styleMap: new OpenLayers.StyleMap(nobo.style.cur_waypoint)});
		
		// if there is a current waypoint...
		if (typeof this.current_waypoint !== "undefined")
			{
				this.cur_waypoint.addFeatures([this.current_waypoint]);
				this.map.addLayer(this.cur_waypoint);

				// change AT address to current mileage
				$("mileage").innerHTML = Math.round(nobo.cur_waypoint.features[0].data.dist);

				// create ${timeAgo} variable to dynamically return time ago (so it can be accurate even after page load)
				this.cur_waypoint.styleMap.styles.default.context = { timeAgo: function(f){ return pretty_date(f.data.time); } };

				// set the center of the map to the current waypoint
				this.map.setCenter([this.current_waypoint.geometry.x, this.current_waypoint.geometry.y], 6);
			}

		// create ${timeAgo} variable to dynamically return time ago (so it can be accurate even after page load)
		if (typeof this.waypoints !== "undefined")
			this.waypoints.styleMap.styles.default.context = { timeAgo: function(f){ return pretty_date(f.data.time); } };

		// used to see if user has 'broken through' the map so they can navigate without restricted bounds
		this.broken_through = false;

		// set center of map at springer w/ zoom level 5 if there Is no current waypoinnt
		if (typeof this.current_waypoint === "undefined")
			this.map.setCenter(this.katahdin.geometry.getBounds().getCenterLonLat(), 5);	

		// add feature clicking and hover events, etc...
		var hover = new OpenLayers.Control.SelectFeature([nobo.waypoints, nobo.terminus, nobo.cur_waypoint], {
				autoActivate: true,
				hover: true,
				renderIntent: "hover",
				highlightOnly: true,
				eventListeners: {
					beforefeaturehighlighted: function(obj) { return !obj.feature.selected } // no state change when feature is selected
				}
			});

		var select = new OpenLayers.Control.SelectFeature([nobo.waypoints, nobo.terminus, nobo.cur_waypoint], {
				autoActivate: true,
				clickout: true,
				eventListeners: {
					beforefeaturehighlighted: function(obj){ obj.feature.selected = true; },
					featureunhighlighted: function(obj){ obj.feature.selected = false; }
				}
			});

		this.zoom_changed();
		
		// add hover & click events to map
		nobo.map.addControl(hover);
		nobo.map.addControl(select);

		// add mapquest tiles
		popup_msg("satellite imgs", true);

		this.tiles = new OpenLayers.Layer.XYZ("mq_aerial", aerial, this.style.mq_options);
		this.tiles.events.register("loadend", this, nobo.tiles_loaded);

		this.tiles.div.style.opacity = 0;
		this.map.addLayer(this.tiles);
		this.map.setBaseLayer(this.tiles);
	},
	tiles_loaded : function(layer)
	{
		// if there's no current waypoint, then user must have not started trail or have just started trail.
		// so let's show the end-user a message bout it. beacuse otherwise they'll see an empty map.

		// if there aren't any current waypoints, we want to show a different page!
		if (nobo.cur_waypoint.features.length == 0)
			popup_msg( (nobo.startend[0] !== "undefined") ? "Dave started his hike on " + nobo.startend[0] + "! Check back in the next few weeks to see his progress! :-)" : "Dave hasn't started his thru-hike yet! But when he starts in late May his progress will be shown on this map. :-)");
		else if ( nobo.startend[1] !== "undefined" )
			popup_msg( "David ended his hike on " + nobo.startend[1] + "!" );
		else
			popup_msg("", true, true); // close popup



		layer.element.className = layer.element.className + " loaded";

		// we don't need loadend event listener anymore, so might as well remove
		layer.object.events.remove("loadend");
		$("menu").className = (nobo.cur_waypoint.features.length == 0) ? "loaded pre" : "loaded" ;
				  
	},
	zoom_changed : function(zoom)
	{
		var zoom_lvl = zoom || nobo.map.getZoom();

		// calculate bounds padding
		var padding_x = (nobo.style.bounds_pct / 100) * (resolutions[zoom_lvl] * window.innerWidth);
		var padding_y = padding_x * .3;

		// for small browsers i think it's more handsome to have the terminus icon at [1.5y,1.5y]
		if (window.innerWidth <= 1024)
			padding_x = padding_y = padding_x*1.5;

		// calculate icon scale versus map zoom level
		var scale = 1 - ((9-zoom_lvl)*.20); 

		// scale the waypoint positions icons
		if ( typeof nobo.waypoints !== "undefined" )
			{
				nobo.waypoints.styleMap.styles.default.defaultStyle = OpenLayers.Util.applyDefaults( { pointRadius: 2.5 * ( 1 + Math.abs(5 -zoom_lvl)*.4) }, nobo.style.waypoints.default);
		
				nobo.waypoints.refresh();
			}

		// set restrictedExtent based upon terminus locations & bounds padding
		// but not if the user is far up enough! (and the user has broken through)
		if ( zoom_lvl >3 && !nobo.broken_through  )
			nobo.map.setOptions({restrictedExtent: OpenLayers.Bounds.fromArray([katahdin[1]-padding_x, katahdin[0]-padding_y, springer[1]+padding_x, springer[0]+padding_y])});
		else if ( zoom_lvl <= 3 )
			{
				nobo.broken_through = true;
				nobo.map.setOptions({restrictedExtent: null});
			}

		// 'disable' zoom buttons if at max or min zoom
		$("zoom_in").className = (zoom_lvl == 8) ? "disabled" : "olButton";
		$("zoom_out").className = (zoom_lvl == 1) ? "disabled" : "olButton";

		// only display waypoints if zoom is greatr or eq to 6
		if ( typeof nobo.waypoints !== "undefined" ) nobo.waypoints.setVisibility( zoom_lvl>=6 );
		// only display cur_waypoint if zoom is grtr or eq to 4
		if ( typeof nobo.cur_waypoint !== "undefined" ) nobo.cur_waypoint.setVisibility( zoom_lvl >= 5);

		nobo.at_states.setVisibility( zoom_lvl>= 4 );

		nobo.terminus.refresh();
	}
};

// thanks to john resig for this one (http://ejohn.org/files/pretty.js). (modified a little bit)
 
function pretty_date(time)
{
	var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
		diff = (((new Date()).getTime() - date.getTime()) / 1000),
		day_diff = Math.floor(diff / 86400);
			
	if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
		return;
			
	return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 minute ago" ||
			diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
		day_diff == 1 && "Yesterday" ||
		day_diff < 31 && day_diff + " days ago";
}

function popup_msg(msg, loading, close)
{
	var is_loading = loading || false;
	var is_closing = close || false;

	if ( is_closing )
		$("popup").className = is_closing ? "loading hidden" : "hidden";
	else if ( is_loading && $("popup").className != "loading" )
		$("popup").className = "loading";
	else if ( !is_loading && $("popup").className != "displayed" )
		$("popup").className = "displayed";
	
	$("popup_msg").innerHTML = msg;
}

function log()
{
	if (typeof arguments === "undefined") return console.log("null log");

	for (var i=0; i<arguments.length; i++)
		console.log(arguments[i]);
};

function $(id)
{
	return document.getElementById(id);
}