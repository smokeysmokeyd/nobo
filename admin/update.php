<?php
  // todo: SHUTDOWN.

require "nobo_config.php";

// connect to DB

try {
  $db = new PDO("mysql:dbname=" . DB_NAME . ";host=" . DB_HOST, DB_USER, DB_PASS);

  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
  die("Connection Failed: " . $e->getMessage());
  }

// email from file for now

$email = file_get_contents("email.txt");
process_email($email);
exit;

if ( isset($_POST) )
  {
	try {
	  if ( isset($_POST["email"]) )
		$waypoint = process_email($_POST["email"]);
	  else if ( isset($_POST["manual"]) )
		$waypoint = process_manual();
	}
	catch (Exception $e) {

	  }
  }
else
  {
	// display update page
  }

// finish this...
function send_update_emails($waypoint)
{
  $addrs = $db->query("SELECT m.email FROM mailing_list AS m");

  if (!$addrs) return;  
  else return;
}

function send_email($to, $subject, $message)
{
  $headers = "From: " . FROM_EMAIL . "\r\n" .
	"Reply-To: " . FROM_EMAIL;

  return mail($to, $subject, $message, $headers);
}

function process_email($email)
{
  include "plancake.inc.php";
  $parser = new PlancakeEmailParser($email);

  $date = $parser->getHeader("Date");
  $body = $parser->getBody();

  // condense body to all one line and replace any extra whitespace
  $unibody = preg_replace("/\R/", " ", $body);
  $unibody = preg_replace("/  /", " ", $unibody);

  $matches = array();

  $dist = preg_match_all("/\*([^\*]+)\*/", $unibody, $matches["dist"]);
  $zip = preg_match_all("/\+([^\+]+)\+/", $unibody, $matches["zip"]);
  $cmd = preg_match_all("/\%([^\%]+)\%/", $unibody, $matches["cmd"]);
  $cmnt = preg_match_all("/\@([^\@]+)\@/", $unibody, $matches["cmnt"]);
  $date = preg_match_all("/\#([^\#]+)\#/", $unibody, $matches["date"]);

  // if there has been a command
  if ( $cmd )
	{
	  $command = strtolower($matches["cmd"][1][0]);

	  if ( substr($command,0,2) == "tn:" )
		$trail_name = substr($command,3);
	  else if ( $command == "shutdown" )
		return; // shut this place down.
	}

  // if user specifies distance
  if ( $dist )
	$waypoint = get_waypoint_from_dist($matches["dist"][1][0]);
  else if ( $zip )
	$waypoint = get_waypoint_from_zip($matches["zip"][1][0]);
  else
	throw new Exception("Zip and distance not specified");

  // if there has been a date specified
  if ( $date )
	{
	  $mdy = explode("-", $matches["date"][1][0]);
	  $waypoint["time"] = date("Y-m-d H:i:s", mktime(12, 0, 0, (int) $mdy[0], (int) $mdy[1], (int) $mdy[2]));
	}
  else // else default to the date on the email. or if that fails, the date right now.
	{
	  $time = !is_empty($parser->getHeader("date")) ? strtotime($parser->getHeader("date")) : time();
	  $waypoint["time"] = date("Y-m-d H:i:s", $time);
	}
														
  // if user specifies comment...
  $waypoint["comment"] = $cmnt ? $matches["cmnt"][1][0] : null;

  return $waypoint;  
}

function get_waypoint_from_dist($dist)
{
  global $db;
  
  $closest = $db->query("SELECT s.name, s.latitude, s.longitude, s.dist, s.civ_state, s.civ_city, s.civ_dist " . 
						"FROM shelters AS s WHERE s.dist <= " . $db->quote($dist) . " ORDER BY s.dist DESC LIMIT 1");

  if (!$closest || empty($closest))
	throw new Exception("Can't find nearest shelter for distance '{$dist}'");
  else
	return $closest->fetch(PDO::FETCH_ASSOC);
}

function get_waypoint_from_zip($zipcode)
{
  global $db;

  $city = $db->query("SELECT z.city, z.state, z.longitude, z.latitude FROM zipcode AS z " .
					 "WHERE z.zip=" . $db->quote($zipcode) . " LIMIT 1");

  $zip = $city->fetch(PDO::FETCH_ASSOC);
 
  $longitude = (float) $zip["longitude"];
  $latitude = (float) $zip["latitude"];

  $radius = 150;

  $lon1 = $longitude-($radius/abs(cos(deg2rad($latitude))*69));
  $lon2 = $longitude+($radius/abs(cos(deg2rad($latitude))*69));
  $lat1 = $latitude-($radius/69);
  $lat2 = $latitude+($radius/69);

  $waypoint = $db->query("SELECT w.name as way_name, w.dist as way_dist, ROUND((3956*2*asin(sqrt(power(sin(({$latitude}-w.latitude)*pi()/180/2),2)+cos({$latitude}*pi()/180)*cos(w.latitude*pi()/180)*power(sin(({$longitude}-w.longitude)*pi()/180/2),2)))),5) as off_dist FROM waypoints as w WHERE w.longitude BETWEEN {$lon1} AND {$lon2} AND w.latitude BETWEEN {$lat1} AND {$lat2} ORDER BY off_dist ASC LIMIT 1");

  $way = $waypoint->fetch(PDO::FETCH_ASSOC);

  if (!$zip || empty($zip))
	throw new Exception("Can't find zipcode: '{$zip}'");
  else if (!$way || empty($way))
	throw new Exception("Can't find closest shelter to zip '{$zip}'");
  else
	return array( "name" => $zip["city"] . ", " . $zip["state"],
				  "dist" => (float) $way["way_dist"] + (float) $way["off_dist"],
				  "longitude" => $zip["longitude"],
				  "latitude" => $zip["latitude"],
				  "civ_state" => $zip["state"],
				  "civ_city" => $zip["city"],
				  "civ_dist" => 0);
}	

?>