<?php
session_start();
define('HOST_NAME', "localhost");
define('PORT', "8090");
$null = NULL;

# require the class ChatHandler
# its for the server can use the funtions in the chathandler.php
require_once("chathandler.php");
$chatHandler = new ChatHandler();

# create socket
$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
# sets socket options for the socket (socket, level, option, value)
socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);
# binds a name to a socket (socket, addres, port)
socket_bind($socket, '127.0.0.1', PORT);
# listens for a connection on a socket
socket_listen($socket);

$clientSocketArray = array($socket); # store the array socket into variable
while (true) {
	$newSocketArray = $clientSocketArray;
	# runs the select() system call on the given arrays of sockets
	# (array, write array, except array, seconds, microseconds)
	socket_select($newSocketArray, $null, $null, 0, 10);

	if (in_array($socket, $newSocketArray)) {
		#accept a socket connection
		$newSocket = socket_accept($socket);
		$clientSocketArray[] = $newSocket;

		# Reads a maximum of length bytes from a socket
		# (socket, length, mode)
		$header = socket_read($newSocket, 1024, PHP_BINARY_READ);
		$chatHandler->doHandshake($header, $newSocket, HOST_NAME, PORT);

		socket_getpeername($newSocket, $client_ip_address); #(socket, address)
		# if new user join and send message
		$connectionACK = $chatHandler->newConnectionACK($client_ip_address, $header);

		$chatHandler->send($connectionACK);

		# Searches the array for socket and returns the first corresponding key if successful
		$newSocketIndex = array_search($socket, $newSocketArray);
		# destroys the specified variables.
		unset($newSocketArray[$newSocketIndex]);
	}

	foreach ($newSocketArray as $newSocketArrayResource) {
		echo "\n foreach!!!!!";
		# receive the data from a connected socket
		while (socket_recv($newSocketArrayResource, $socketData, 1024, 0) >= 1) {
			$socketMessage = $chatHandler->unseal($socketData);
			$messageObj = json_decode($socketMessage);
			# if logout is true, then send a separate message
			if (isset($messageObj->logout)) {
				$chat_box_message = $chatHandler->logoutMessage($messageObj->chat_user, $messageObj->logout);
			} else if (isset($messageObj->reply_src)) {
				#create chatbox with the user name and its message
				$chat_box_message = $chatHandler->replyMessage($messageObj->chat_user, $messageObj->chat_message, $messageObj->user_img, $messageObj->reply_src, $messageObj->replied_user, $messageObj->reply_message, $messageObj->sendDate);
			} else {
				#create chatbox with the user name and its message
				$chat_box_message = $chatHandler->createChatBoxMessage($messageObj->chat_user, $messageObj->chat_message, $messageObj->user_img, $messageObj->sendDate);
			}
			# send the socket to chathadler class send method
			$chatHandler->send($chat_box_message);
			break 2;
		}
		# reads a maximum of length bytes from a socket
		$socketData = @socket_read($newSocketArrayResource, 1024, PHP_NORMAL_READ);
		if ($socketData === false) {
			socket_getpeername($newSocketArrayResource, $client_ip_address);
			$connectionACK = $chatHandler->connectionDisconnectACK($client_ip_address);
			$chatHandler->send($connectionACK);
			$newSocketIndex = array_search($newSocketArrayResource, $clientSocketArray);
			unset($clientSocketArray[$newSocketIndex]);
		}
	}
}
# used to close the resource that belongs to the socket
socket_close($socket);
