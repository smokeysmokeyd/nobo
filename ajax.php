<?php

require "admin/nobo_config.php";

try {
  $db = new PDO("mysql:dbname=" . DB_NAME . ";host=" . DB_HOST, DB_USER, DB_PASS);

  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
  die("Connection Failed: " . $e->getMessage());
  }

set_error_handler("err_handlr");

if ( !empty($_POST) )
  {
	if ( isset($_POST["p_msg"]) ) // if is postcard message
	  {
		// check empty
		if ( empty($_POST["p_msg"]) )
		  trigger_error("No message was entered!", E_USER_ERROR);
		
		// put message into database
		$update = $db->exec("INSERT INTO messages(ip_address, message) VALUES(" . $db->quote($_SERVER["REMOTE_ADDR"]) . "," . $db->quote($_POST["p_msg"]) . ")");

		if ( !$update )
		  trigger_error("Was not able to enter comment into database!");

		// send copy to email
		if ( mail("trailhe@d-luv.net", "[comment] from {$_SERVER["REMOTE_ADDR"]}", $_POST["p_msg"]) )
		  echo json_encode(array("msg" => "Comment has been successfully entered!"));
		else
		  trigger_error("Couldn't send a copy of comment to " . U_TRAIL_NAME . "'s email", E_USER_ERROR);
	  }
	else if ( isset($_POST["u_email"]) ) // if is update request
	  {
		// sanitize email
		if ( filter_var($_POST["u_email"], FILTER_VALIDATE_EMAIL) )
		  $email = filter_var($_POST["u_email"], FILTER_SANITIZE_EMAIL);
		else
		  trigger_error("Email address is invalid", E_USER_ERROR);

		// check if email was already entered
		$dupe_chk = $db->query("SELECT count(*) FROM `mailing_list` AS m WHERE m.email=" . $db->quote($email));
		$dupe = $dupe_chk->fetch(PDO::FETCH_NUM);

		if ( $dupe[0] > 0 )
		  trigger_error("Email address is already signed up for updates!", E_USER_ERROR);

		// enter email into database
		if ( $db->exec("INSERT INTO mailing_list(email) VALUES(" . $db->quote($email) . ")") === false )
		  trigger_error("Could not add email address to mailing list", E_USER_ERROR);

		// trigger first email sent

		if ( send_email($email, "yo bro", "yoooooo") )
		  echo json_encode(array("msg" => "Sweet!! You have been signed up for email updates! A confirmation email has been dispatched to your address. Much Love. -D"));
		else
		  trigger_error("An error occurred when trying to send you an email.");
	  }
  }

function send_email($to, $subject, $message)
{
  $headers = "From: " . FROM_EMAIL . "\r\n" .
	"Reply-To: " . FROM_EMAIL;

  return mail($to, $subject, $message, $headers);
}

function err_handlr($err_no, $err_str, $err_file, $err_line)
{
  echo json_encode(array("error" => $err_str));
  exit;
}
?>