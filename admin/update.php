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

if ( !empty($_POST) )
  {
	try {
	  // parse input into easy access arrays
	  if ( isset($_POST["Body"]) )
		$data = process_email();
	  else if ( isset($_POST["f"]) )
		$data = process_manual($_POST["f"]);
	  else
		die("not sure what to do with no data to process");

	  // if time hasn't been specified already, use current server time
	  if ( is_null($data["time"]) )
		$data["time"] = date("Y-m-d H:i:s");

	  // if user specifies a waypoint w/ zip or dist
	  if ( !is_null($data["dist"]) )
		$data["waypoint"] = get_waypoint_from_dist($data["dist"]);
	  else if ( !is_null($data["zip"]) )
		$data["waypoint"] = get_waypoint_from_zip($data["zip"]);
	  else
		$data["waypoint"] = null;

	  // check for duplicate waypoint
	  $dupe_check = $db->query("SELECT count(*) FROM waypoints AS w WHERE w.dist=" . $db->quote($data["waypoint"]["dist"]));
	  $dupe = $dupe_check->fetch(PDO::FETCH_NUM);

	  if ( $dupe[0] > 0 )
		throw new Exception("There is already a waypoint with distance '{$data["waypoint"]["dist"]}'");

	  // check for commands
	  if ( !is_null($data["command"]) )
		{
		  if ( substr_count($data["command"], "=") == 1 ) // user wants to set variable
			change_variable($data["command"]);
		  else if ($data["command"] == "shutdown") // 'nuff of this. i'm out!
			shut_this_thing_down();
		  else
			throw new Exception("Can't understand command '{$data["command"]}'");
		}

	  // if there's a waypoint, add it to DB and send email to mailing list
	  if ( !is_null($data["waypoint"]) )
		{
		  update_waypoint($data);
		  send_update_emails($data);
		}
	}
	catch (Exception $e) {
	  if ( isset($data["email"]) ) // if data was sent via email, send error to sender
		send_email($data["email"], "Error", "Error: " . $e->getMessage());
	  else // if it was manual, show the error in html
		echo "<h1>Error: " . $e->getMessage() . "</h1>";

	  exit; // end script right there.
	  }
  }
else
  {
	$fields = array("zip", "dist", "command", "time", "comment");
	echo "<!DOCTYPE html>\n<html><head><title>manual input</title></head><body><form action=\"{$_SERVER["PHP_SELF"]}\" method=\"POST\"><table>";
	
	foreach ($fields as $field)
	  {
		echo "<tr><td><input type=\"checkbox\" name=\"f[{$field}]\" value=\"1\"/></td><td>{$field}:</td><td><input type=\"text\" name=\"v[{$field}]\"/></td></tr>";
	  }

	echo "<tr><td colspan=\"3\" align=\"right\"><input type=\"submit\"></td></tr></table></form></body></html>";
  }

function process_manual($fields)
{
  $all_fields = array("dist" => "/^(?:[1-9]\d*|0)?(?:\.\d+)?$/",
					  "zip" => "/^\d{5}$/",
					  "time" => "/^\d{1,2}\-\d{1,2}\-\d{4}$/",
					  "command" => "",
					  "comment" => "");
  $data = array();

  if ( empty($fields) )
	throw new Exception("No data has been inputted");
  
  foreach ( $all_fields as $field => $regex)
	{
	  if ( isset($fields[$field]) && isset($_POST["v"][$field]) ) // if field has been specified by user
		{
		  $value = $_POST["v"][$field];

		  if ( !empty($regex) && !preg_match($regex, $value) ) // input doesn't match regex
			throw new Exception("'{$field}' is formatted incorrectly!");

		  // the field 'time' is special...
		  if ( $field == "time" )
			{
			  $time = explode("-", $value);
			  $data[$field] = date("Y-m-d H:i:s", mktime(12, 0, 0, (int) $time[0], (int) $time[1], (int) $time[2]));
			}
		  else
			$data[$field] = $value;
		}
	  else
		$data[$field] = null;
	}

  return $data;
}

function update_waypoint($data)
{
  global $db;

  $waypoint = $data["waypoint"];
  $waypoint["time"] = $data["time"]; // add time to waypoint info

  $fields = array_keys($waypoint); // get waypoint fields from array

  $update = $db->prepare("INSERT INTO waypoints(" . implode(",", $fields) . ") VALUES(:" . implode(",:", $fields) . ")");

  if (!$update->execute($waypoint))
	throw new Exception("Waypoint DB update failed!");
  else if (isset($data["email"])) // if it works send a message of success to the sender's email
	send_email($data["email"], "Success", "{$waypoint["name"]}");
}

function send_update_emails($data)
{
  global $db;

  $waypoint = $data["waypoint"];
  $addrs = $db->query("SELECT m.email FROM mailing_list AS m");
  $emails = $addrs->fetchAll(PDO::FETCH_COLUMN, 0);

  if (!$emails || empty($emails)) // if there are no emails on list, return
	return;

  $trail_name = U_TRAIL_NAME;

  if ( !is_null($data["comment"]) ) // if user specified comment, make that email subject
	$subject = $data["comment"];
  else if ( (int) $waypoint["dist"] == 0 ) // starting out
	$subject = "the journey begins";
  else if ( (float) $waypoint["dist"] == TOTAL_MILES ) // finishing
	$subject = "made it to katahdin";
  else
	$subject = "(no subject)";
	
	  $message = <<<MSG
DIST: {$waypoint["dist"]} mi.
LOC: {$waypoint["name"]}
 (near {$waypoint["civ_city"]}, {$waypoint["civ_state"]})
TIME: {$data["time"]}

./{$trail_name}
MSG;

  for ($i=0; $i<count($emails); $i++)
	send_email($emails[$i], $subject, $message);
}

function change_variable($string)
{
  $cfg = file_get_contents("nobo_config.php");
  $parts = preg_replace("/[^a-zA-Z0-9\ \_\-]/", "", explode("=", $string));
  
  $new_cfg = preg_replace("/define\(\"U_{$parts[0]}\", \"[^\"]+\"\);/i", "define(\"U_" .
						  strtoupper($parts[0]) . "\", \"{$parts[1]}\")", $config, -1, $matches);

  if ($matches == 1)
	file_put_contents("nobo_config.php", $new_cfg);
  else
	throw new Exception("Failed to update field '{$parts[0]}' with value '{$parts[1]}'");  
}

function shut_this_thing_down()
{
  // move index.php to index2.php
  // move shutdown.php to index.php
  // return shutdown success
}

function send_email($to, $subject, $message)
{
  $headers = "From: " . FROM_EMAIL . "\r\n" .
	"Reply-To: " . FROM_EMAIL;

  return mail($to, $subject, $message, $headers);
}

function process_email($email)
{
  $e_date = $_POST["Date"];
  $body = $_POST["Body"];

  // condense body to all one line and replace any extra whitespace
  $unibody = preg_replace("/\R/", " ", $body);
  $unibody = preg_replace("/  /", " ", $unibody);

  $matches = array();

  $dist = preg_match_all("/\*((?:[1-9]\d*|0)?(?:\.\d+)?)\*/", $unibody, $matches["dist"]);
  $zip = preg_match_all("/\+(\d{5})\+/", $unibody, $matches["zip"]);
  $cmd = preg_match_all("/\%([^\%]+)\%/", $unibody, $matches["cmd"]);
  $cmnt = preg_match_all("/\@([^\@]+)\@/", $unibody, $matches["cmnt"]);
  $date = preg_match_all("/\#(\d{1,2}\-\d{1,2)\-[\d{2}|\d{4}])\#/", $unibody, $matches["date"]);

  // get email address update was sent from
  $email = preg_match("/[a-z0-9\.\+\-]+@[a-z0-9\-]+\.[a-z0-9\.\-]+/i", $_POST["From"], $from_email);
														
  // if user specifies comment...
  $comment = $cmnt ? $matches["cmnt"][1][0] : null;

  // if user specifies date
  if ( $date )
	{
	  $mdy = explode("-", $matches["date"][1][0]);
	  $time = date("Y-m-d H:i:s", mktime(12, 0, 0, (int) $mdy[0], (int) $mdy[1], (int) $mdy[2]));
	}
  else // else default to the date email claimed to be sent. or if there is none, make it null
	{
	  $time = !empty($e_date) ? date("Y-m-d H:i:s", strtotime($e_date)) : null;
	}
  
  // return all the info, formatted.
  return array("time"       => $time,
			   "email"      => $email ? $from_email[0] : DLUV_EMAIL,
			   "zip"        => $zip ? $matches["zip"][1][0] : null,
			   "dist"       => $dist ? $matches["dist"][1][0] : null,
			   "comment"    => $comment,
			   "command"    => $cmd ? strtolower($matches["cmd"][1][0]) : null);
}

function get_waypoint_from_dist($dist)
{
  global $db;
  
  // get the closest previous shelter
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

  // get city that corresponds to zip
  $city = $db->query("SELECT z.city, z.state, z.longitude, z.latitude FROM zipcode AS z " .
					 "WHERE z.zip=" . $db->quote($zipcode) . " LIMIT 1");

  $zip = $city->fetch(PDO::FETCH_ASSOC);

  // if can't find the zipcode in our db, throw an error
  if (!$zip || empty($zip))
	throw new Exception("Can't find zipcode: '{$zipcode}'");

  $longitude = (float) $zip["longitude"];
  $latitude = (float) $zip["latitude"];

  // find distance from zipcode to closest AT shelter (so distance value will be more accurate)
  $radius = TRAILTOWN_RADIUS;

  $lon1 = $longitude-($radius/abs(cos(deg2rad($latitude))*69));
  $lon2 = $longitude+($radius/abs(cos(deg2rad($latitude))*69));
  $lat1 = $latitude-($radius/69);
  $lat2 = $latitude+($radius/69);

  $shelter = $db->query("SELECT s.dist as shl_dist, ROUND((3956*2*asin(sqrt(power(sin(({$latitude}-s.latitude)*pi()/180/2),2)+cos({$latitude}*pi()/180)*cos(s.latitude*pi()/180)*power(sin(({$longitude}-s.longitude)*pi()/180/2),2)))),1) as off_dist FROM shelters as s where s.longitude BETWEEN {$lon1} AND {$lon2} AND s.latitude BETWEEN {$lat1} AND {$lat2} ORDER BY off_dist ASC LIMIT 1");

  $shl = $shelter->fetch(PDO::FETCH_ASSOC);

  if (!$shl || empty($shl))
	throw new Exception("Can't find closest shelter to zip '{$zipcode}'");
  else
	return array( "name" => $zip["city"] . ", " . $zip["state"],
				  "dist" => (float) $shl["shl_dist"] + (float) $shl["off_dist"],
				  "longitude" => $zip["longitude"],
				  "latitude" => $zip["latitude"],
				  "civ_state" => $zip["state"],
				  "civ_city" => $zip["city"],
				  "civ_dist" => 0);
}	

?>