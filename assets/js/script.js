/*
 * WMATA Status
 *
 * An implmentation of the WMATA API, to provide an easier way of accessing
 * information about train schedules and advisories on the Washington, D.C.
 * Metro.
*/

$(document).ready(function(){
	$(".next-trains").click(function(){
		//var overlayColor = $(this).closest(".column");
		if ($(this).closest(".column").hasClass("green")){
			$(".overlay").addClass("green");
		}
		else if ($(this).closest(".column").hasClass("red")){
			$(".overlay").addClass("red");
		}
		else if ($(this).closest(".column").hasClass("blue")){
			$(".overlay").addClass("blue");
		}
		else if ($(this).closest(".column").hasClass("orange")){
			$(".overlay").addClass("orange");
		}
		else if ($(this).closest(".column").hasClass("yellow")){
			$(".overlay").addClass("yellow");
		}
		else if ($(this).closest(".column").hasClass("silver")){
			$(".overlay").addClass("silver");
		}
	});
});

var trainLine = $('.next-trains').click(function(){
	// Setting line in variable
	trainLine = $(this).data('line');
});

var fsOverlay = function(){
  var body = $('body'),
      overlay = $('.overlay'),
      trigger = $('.next-trains'),
      close = $('.close'),
      content = $('.content');
  openModal = function(e){
    e.preventDefault();
    content.addClass('overlayActive');
    overlay.addClass('overlayOpen');
  }
  closeModal = function(e){
    e.preventDefault();
    content.removeClass('overlayActive');
    overlay.removeClass('overlayOpen');
    $("#results").empty();
    trainLine = '';
    overlay.removeClass('silver yellow orange blue red green');
  }
  trigger.on("click", openModal);
  close.on("click", closeModal);
  body.on("keyup", function(e){
    if(e.keyCode == 27){
      close.trigger("click");
    }
  });
}

$(fsOverlay);


var wmata_api_key = "YOUR-API-KEY-GOES-HERE";

var wmata_lines_url = "http://api.wmata.com/Rail.svc/json/JLines";
var wmata_stations_url = "http://api.wmata.com/Rail.svc/json/JStations";
var wmata_station_info_url = "http://api.wmata.com/Rail.svc/json/JStationInfo";
var wmata_trains_url = "http://api.wmata.com/StationPrediction.svc/json/GetPrediction";
var wmata_incidents_url = "http://api.wmata.com/Incidents.svc/json/Incidents";

var proxy_url = "./proxy.php?url=";

function tr_time (time)
{
	switch (time)
	{
		case "---": return "Eventually";
		case "ARR": return "Arriving";
		case "BRD": return "Boarding";
		case "1": return "1 minute";
		default: return time + " minutes";
	}
}

function tr_line (line)
{
	switch (line.toLowerCase())
	{
		case "rd": return "Red";
		case "or": return "Orange";
		case "yl": return "Yellow";
		case "gr": return "Green";
		case "bl": return "Blue";
		case "sv": return "Silver";
	}
}

function concat_line_codes (s)
{
	line = s.LineCode1.toLowerCase();
	if (s.LineCode2) line += ("," + s.LineCode2.toLowerCase());
	if (s.LineCode3) line += ("," + s.LineCode3.toLowerCase());
	if (s.LineCode4) line += ("," + s.LineCode4.toLowerCase());
	return line;
}

function concat_station_codes (s)
{
	var code = s.Code;
	if (s.StationTogether1 != "") code += ("," + s.StationTogether1);
	if (s.StationTogether2 != "") code += ("," + s.StationTogether2);
	return code;
}

function draw_line_color_bullets (lines)
{
	var str = '<div class="line_color_bullets">';
	var l = lines.replace(";", ",").split(",");
	for (var i in l)
	{
		str += '<span class="' + l[i] + '"></span>';
	}
	str += '</div>';
	return str;
}

function escape (s)
{
	return s.replace("'", "’");
}

function get_lines()
{
	return ['rd', 'or', 'yl', 'gr', 'bl', 'sv'];
}

function list_lines()
{
	var str = '<h2>Metrorail lines</h2>\n<ul>';
	var lines = get_lines();
	for (var l in lines)
	{
		str += '<li>' + draw_line_color_bullets(lines[l]) + '<a href="#" onclick="list_stations(\'' + lines[l] + '\')">' + tr_line(lines[l]) + '</a></li>\n';
	}
	str += '</ul>';
	document.getElementById("results").innerHTML = str;
}

function get_stations (line)
{
	var stations = [];
	var url = proxy_url + wmata_stations_url;

	if (line != null)
		url += '%3FLineCode=' + line + '%26api_key=' + wmata_api_key;
	else
		url += '%3Fapi_key=' + wmata_api_key;

	$.ajax ({
		url: url,
		async: false,
		dataType: 'json',
		success: function (data)
		{
			stations = data.Stations;
		}
	});

	return stations;
}

function list_stations (line)
{
	var stations = get_stations(line);
	var str = '<h2>' + tr_line(line) + ' line stations</h2><ul class="stations">';
	for (var s in stations)
	{
		str += '<li>' + draw_line_color_bullets(concat_line_codes(stations[s])) + ' <a href="#" onclick="get_trains(\'' + concat_station_codes(stations[s]) + '\', \'' + escape(stations[s].Name) + '\')">' + escape(stations[s].Name) + '</a></li>\n';
	}
	str += '</ul>';
	document.getElementById("results").innerHTML = str;
}

function try_closest_station()
{
	if (navigator.geolocation)
	{
		navigator.geolocation.getCurrentPosition(get_closest_station);
	}
	else
	{
		document.getElementById("results").innerHTML = '<p style="font-size: 0.875em">Your browser does not support this functionality, or it could not find your location. You will have to enter a station manually.</p>';
	}
}

function distance (x1, y1, x2, y2)
{
	var dx = Math.pow(x2 - x1, 2);
	var dy = Math.pow(y2 - y1, 2);

	return Math.pow(dx + dy, 0.5);
}

function get_closest_station (position)
{
	var my_lat = position.coords.latitude;
	var my_lon = position.coords.longitude;

	var s = get_stations();
	var station_dist = 180;
	var closest;

	$.each(s, function()
	{
		var dist = distance(my_lat, my_lon, this.Lat, this.Lon);
		if (dist < station_dist)
		{
			station_dist = dist;
			closest = this;
		}
	});

	get_trains(concat_station_codes(closest), closest.Name);

	return closest;
}

function get_station_info (code)
{
	var station;
	$.ajax({
		url: proxy_url + wmata_station_info_url + '%3FStationCode=' + code + '%26api_key=' + wmata_api_key,
		async: false,
		dataType: 'json',
		success: function (data)
		{
			station = data;
		}
	});
	return station;
}

function get_trains (code, name)
{
	// second parameter for station name is very hacky, look into a better way to save an API call
	name = name || get_station_info(code).Name;
	var str = '<a onclick="list_stations(trainLine)"><i class="back">Back</i></a><h2>Trains through ' + escape(name) + '</h2>';

	$.ajax({
		url: proxy_url + wmata_trains_url + '/' + code + '%3Fapi_key=' + wmata_api_key,
		async: false,
		dataType: 'json',
		success: function (data)
		{
			try
			{
				if (data.Trains.length > 0)
				{
					str += '<ul>';
					for (var i in data.Trains)
					{
						var train = data.Trains[i];
						str += '<li class="train"><strong class="li_head">' + tr_time(train.Min) + '</strong><br />';
						switch (train.DestinationName)
						{
							case 'No Passenger':
								continue; // don't show No Passenger trains
							case 'Special':
								str += 'Special train';
								break;
							case 'Train':
								str += draw_line_color_bullets(train.Line.toLowerCase()) + ' Train';
								break;
							default:
								str += draw_line_color_bullets(train.Line.toLowerCase()) + ' ' + tr_line(train.Line) + ' to ' + train.DestinationName + '</li>';
								break;
						}
						str += '</li>';
					}
					str += '</ul>';
				}
				else
				{
					str += '<p>No trains are currently scheduled to stop at this station.</p>';
				}
			}
			catch (Exception)
			{
				str += '<p>Train information is currently unavailable.</p>';
			}
			finally
			{
				document.getElementById("results").innerHTML = str;
			}
		}
	});
}

function list_advisories()
{
	var str = '<h2>Service advisories</h2>'

	$.ajax({
		url: proxy_url + wmata_incidents_url + '%3Fapi_key=' + wmata_api_key,
		async: false,
		dataType: 'json',
		success: function (data)
		{
			try
			{
				if (data.Incidents.length > 0)
				{
					str += '<ul>';
					for (var i in data.Incidents)
					{
						var incident = data.Incidents[i];
						str += '<li><strong class="li_head">' + incident.IncidentType + '</strong><br />' + incident.Description + "</li>\n";
					}
					str += '</ul>';
				}
				else
				{
					str += '<p>There are no service advisories.</p>';
				}
			}
			catch (Exception)
			{
				str += '<p>Service advisory information is currently unavailable.</p>';
			}
			finally
			{
				document.getElementById("results").innerHTML = str;
			}
		}
	});
}
