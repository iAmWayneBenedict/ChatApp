<?php
class ChatHandler
{

	# writes to the socket from the given data.
	function send($message)
	{
		global $clientSocketArray;
		$messageLength = strlen($message);
		foreach ($clientSocketArray as $clientSocket) {
			@socket_write($clientSocket, $message, $messageLength);
		}
		return true;
	}

	function unseal($socketData)
	{
		# Convert the first byte of a string to a value between 0 and 255
		$length = ord($socketData[1]) & 127;
		if ($length == 126) {
			$masks = substr($socketData, 4, 4);
			$data = substr($socketData, 8);
		} elseif ($length == 127) {
			$masks = substr($socketData, 10, 4);
			$data = substr($socketData, 14);
		} else {
			$masks = substr($socketData, 2, 4);
			$data = substr($socketData, 6);
		}
		$socketData = "";
		for ($i = 0; $i < strlen($data); ++$i) {
			$socketData .= $data[$i] ^ $masks[$i % 4];
		}
		return $socketData;
	}

	function seal($socketData)
	{
		$b1 = 0x80 | (0x1 & 0x0f);
		$length = strlen($socketData);

		# pack data into binary string
		# (format, , value)
		if ($length <= 125)
			$header = pack('CC', $b1, $length);
		elseif ($length > 125 && $length < 65536)
			$header = pack('CCn', $b1, 126, $length);
		elseif ($length >= 65536)
			$header = pack('CCNN', $b1, 127, $length);
		return $header . $socketData;
	}

	# Handshake - sending three packets between the two hosts.
	function doHandshake($received_header, $client_socket_resource, $host_name, $port)
	{
		$headers = array();
		$lines = preg_split("/\r\n/", $received_header);
		foreach ($lines as $line) # 
		{
			$line = chop($line);
			if (preg_match('/\A(\S+): (.*)\z/', $line, $matches)) {
				$headers[$matches[1]] = $matches[2];
			}
		}

		$secKey = $headers['Sec-WebSocket-Key'];
		$secAccept = base64_encode(pack('H*', sha1($secKey . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
		$buffer  = "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" .
			"Upgrade: websocket\r\n" .
			"Connection: Upgrade\r\n" .
			"WebSocket-Origin: $host_name\r\n" .
			"WebSocket-Location: ws://$host_name:$port/demo/shout.php\r\n" .
			"Sec-WebSocket-Accept:$secAccept\r\n\r\n";
		# writes to the socket from the given data.
		socket_write($client_socket_resource, $buffer, strlen($buffer));
	}

	# handle if new user join in the server 
	function newConnectionACK($client_ip_address, $newSocket)
	{
		$message = 'New client ' . $client_ip_address . ' joined';
		$messageArray = array('message' => $message, 'message_type' => 'chat-connection-ack');
		$ACK = $this->seal(json_encode($messageArray));
		return $ACK;
	}

	# if the connection is disconnected
	function connectionDisconnectACK($client_ip_address)
	{
		$message = 'Client ' . $client_ip_address . ' disconnected';
		$messageArray = array('message' => $message, 'message_type' => 'chat-connection-ack');
		$ACK = $this->seal(json_encode($messageArray));
		return $ACK;
	}

	# ccreate the chat box / display user name and message
	function createChatBoxMessage($chat_user, $chat_box_message, $user_img, $sendDate)
	{

		$messageArray = array('message' => $chat_box_message, 'date' => $sendDate, 'chatUser' => $chat_user, 'image' => $user_img, 'message_type' => 'chat-box-html');
		$chatMessage = $this->seal(json_encode($messageArray));
		return $chatMessage;
	}

	# ccreate the chat box / display user name and message
	function replyMessage($chat_user, $chat_box_message, $user_img, $reply_src, $replied_user, $reply_message, $sendDate)
	{

		$messageArray = array('message' => $chat_box_message, 'date' => $sendDate, 'chatUser' => $chat_user, 'image' => $user_img, 'reply_src' => $reply_src, 'replied_user' => $replied_user, 'reply_message' => $reply_message,  'message_type' => 'chat-box-html');
		$chatMessage = $this->seal(json_encode($messageArray));
		return $chatMessage;
	}

	# create logout message
	function logoutMessage($chat_user, $logout)
	{

		$messageArray = array('chatUser' => $chat_user, 'logout' => $logout, 'message_type' => 'chat-box-html');
		$chatMessage = $this->seal(json_encode($messageArray));
		return $chatMessage;
	}
}
