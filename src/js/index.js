$(function () {
	// get the current User
	let currentUser = JSON.parse(sessionStorage.getItem("user"));

	// if there are no session for current user, then redirect to login-signup page
	if (!currentUser) {
		location.href = "http://localhost/ChatApp/views/login-signup.html";
	}

	// display current user on the recipient container
	$(".recipient").append(
		contactRecipient(currentUser.img, currentUser.username)
	);

	// display current users info
	$(".current-username").text(currentUser.username);
	$(".current-userimage").attr("src", currentUser.img);

	// websocket
	var websocket = new WebSocket("ws://localhost:8090/server.php");
	websocket.onopen = function (event) {
		console.log("Connection is established!");
	};

	websocket.onmessage = function (event) {
		//recieve data from chat class and display data to connected user
		var Data = JSON.parse(event.data); // convert json string to javascript object
		if (!Data.chatUser) {
			console.log(Data.message);
		} else if (Data.chatUser !== currentUser.username) {
			// if a user logged out then delete its session and message the status
			if (Data.logout) {
				$(".message-container").append(
					`<p class="w-full text-center text-sm text-slate-600">${Data.chatUser} has left the room</p>`
				);
				deleteSessionData(Data.chatUser);
				return;
			}

			// if the replied message is from the current user, then set the replied user to "You"
			if (Data.replied_user === currentUser.username) {
				user_reply = "You";
			} else {
				user_reply = Data.replied_user;
			}
			if (Data.reply_src) {
				// append new message from contacts
				$(".message-container").append(
					contactMessageBalloon(
						Data.image,
						Data.message,
						Data.date,
						Data.chatUser,
						Data.reply_src,
						user_reply,
						Data.reply_message
					)
				);
			} else {
				// append new message from contacts
				$(".message-container").append(
					contactMessageBalloon(
						Data.image,
						Data.message,
						Data.date,
						Data.chatUser
					)
				);
			}

			// do not display if it's already has the same class
			if ($("." + Data.chatUser).length < 1) {
				$(".recipient").append(
					contactRecipient(Data.image, Data.chatUser)
				);
				setToSessionStorage(Data.image, Data.chatUser);
			}

			$(".reply-message-btn").each(function () {
				$(this).click(function () {
					$(".reply-viewer").removeClass("hidden");
					let src = $(this).parents(".contact-message").attr("id");
					let username = $(this)
						.parents(".contact-message")
						.attr("id")
						.split("-")[0];

					let message = $(this)
						.parents(".contact-message")
						.find(".message-text")
						.text();

					// append the reply data to hidden input fields
					appendReplyMessage(src, username, message);
					$(".message-form").append(replyViewer(username, message));
				});
			});
		} else {
			// wait for the response to redirect
			if (Data.logout) {
				location.href =
					"http://localhost/ChatApp/views/login-signup.html";
				return;
			}

			// display reply container in the current user
			if (Data.reply_src) {
				// append new message from contacts
				$(".message-container").append(
					messageBalloon(
						Data.message,
						Data.date,
						Data.reply_src,
						Data.replied_user,
						Data.reply_message
					)
				);
			} else {
				// append new message from self
				$(".message-container").append(
					messageBalloon(Data.message, Data.date)
				);
			}
		}
		// every time a message pops up, it scrolls to the newest message
		$(".message-container").scrollTop(
			document.querySelector(".message-container").scrollHeight
		);
		// $("#chat-message").val("");
	};

	websocket.onerror = function (event) {
		console.error("Problem due to some Error");
	};
	websocket.onclose = function (event) {
		console.log("Connection Closed");
	};

	// end

	// dark mode toggler
	$(".toggler").click(function () {
		$(this).toggleClass("after:left-0.5");
		$(this).toggleClass("after:left-[1.375rem]");
		$(this).toggleClass("after:bg-slate-600");
		$(this).toggleClass("after:bg-slate-50");
		$(this).toggleClass("bg-slate-300");
		$(this).toggleClass("bg-indigo-500");
		document.documentElement.classList.toggle("dark");
	});

	// send message
	$("form.message-form").submit(function (event) {
		event.preventDefault();
		// get the message
		const replySrc = $("form.message-form").serializeArray()[0].value;
		const repliedUser = $("form.message-form").serializeArray()[1].value;
		const replyMessage = $("form.message-form").serializeArray()[2].value;
		const hasReplied = $("form.message-form").serializeArray()[3].value;
		const message = $("form.message-form").serializeArray()[4].value;
		// get and parse the stored data in localStorage
		let sessionData = JSON.parse(sessionStorage.getItem("user"));
		var messageJSON;

		// if empty, do not create new message
		if (!message) return;

		// if the current user replied to a message, then declare the reply data, else declare a normal message
		// messageJSON will be sent to websocket
		if (hasReplied === "true") {
			messageJSON = {
				chat_user: sessionData.username,
				chat_message: message,
				user_img: sessionData.img,
				reply_src: replySrc,
				replied_user: repliedUser,
				reply_message: replyMessage,
				sendDate: getDate(),
			};
		} else {
			messageJSON = {
				chat_user: sessionData.username,
				chat_message: message,
				user_img: sessionData.img,
				sendDate: getDate(),
			};
		}

		// clear form
		event.target.reset();
		// close the reply viewer
		$(".reply-viewer").addClass("hidden");
		$("#hasReplied").val(false);

		//convert data variable into json string and send to server.php
		websocket.send(JSON.stringify(messageJSON));
	});

	// hamburger
	$(".hamburger").click(function () {
		$(".side-bar").toggleClass("hidden");
		$(".side-bar").toggleClass("left-[-100%]");
		$(".side-bar").toggleClass("left-0");
	});

	// logout
	$(".logout-btn").click(function () {
		// set data to send to websocket
		var messageJSON = {
			chat_user: currentUser.username,
			logout: true,
		};
		//convert data variable into json string and send to server.php
		websocket.send(JSON.stringify(messageJSON));
		sessionStorage.clear();
	});

	// close the reply viewer
	$(".close-reply-btn").click(function () {
		$(".reply-viewer").addClass("hidden");
		$("#hasReplied").val(false);

		// clear the reply data
		$("#reply-src").val("");
		$("#replied-user").val("");
		$("#reply-message").val("");
	});

	// functions

	// populate the hidden input fields with reply data
	function appendReplyMessage(replySrc, repliedUser, replyMessage) {
		$("#reply-src").val(replySrc);
		$("#replied-user").val(repliedUser);
		$("#reply-message").val(replyMessage);
	}

	// display reply viewer
	function replyViewer(username, message) {
		$(".reply-to-username").text(username);
		$(".reply-to-username").parent().next().text(message);
		$("#hasReplied").val(true);
	}

	// message balloon for messages from self
	function messageBalloon(
		message,
		date,
		replyLocation = "",
		replyUsername = "",
		replyMessage = ""
	) {
		let isHidden = "hidden";
		if (replyLocation) {
			isHidden = "";
		}
		return `<div class="py-3 flex flex-col items-end">
					<div class="block">
						<div class="flex flex-col items-end">
							<a href="#${replyLocation}" class="${isHidden} reply-self-attachment">
								<i class="text-xs text-slate-800 dark:text-slate-400 transition-all-3ms">Replied to <b>${replyUsername}</b></i>
								<p class="reply-text text-slate-600 dark:text-slate-50 text-sm bg-neutral-100 transition-all-3ms dark:bg-slate-500 w-fit px-5 py-2 rounded-3xl mb-1 text-ellipsis overflow-hidden whitespace-nowrap max-w-[18rem] lg:max-w-[25rem] xl:max-w-[35rem] break-words">
									<i>${replyMessage}</i>
								</p>
							</a>

							<p class="bg-blue-500 w-fit px-5 py-2 rounded-3xl rounded-br-none text-slate-100 max-w-[18rem] lg:max-w-[25rem] xl:max-w-[35rem] whitespace-pre-line break-words">${message}</p>
						</div>
					</div>
					<div class="text-xs text-gray-500 dark:text-slate-400 transition-all-3ms">${date}</div>
				</div>`;
	}

	// message balloon for messages from contacts
	function contactMessageBalloon(
		img,
		message,
		date,
		username,
		replyLocation = "",
		replyUsername = "",
		replyMessage = ""
	) {
		let isHidden = "hidden";
		if (replyLocation) {
			isHidden = "";
		}
		return `<!-- message balloon container from a contact -->
					<div class="contact-message py-2 flex items-end group" id="${username}-${getRandomNumberBasedInTime()}">
						<!-- profile -->
						<img src="${img}" class="w-9 h-9 rounded-full" alt="Profile">
						<!-- message -->
						<div class="block ml-3">
							<div class="flex items-center">
								<div>
									<a href="#${replyLocation}" class="${isHidden} reply-contact-attachment">
										<i class="text-xs text-slate-800 dark:text-slate-400 transition-all-3ms">Replied to <b>${replyUsername}</b></i>
										<p class="reply-text text-slate-600 dark:text-slate-50 text-sm bg-neutral-100 transition-all-3ms dark:bg-slate-500 w-fit px-5 py-2 rounded-3xl mb-1 text-ellipsis overflow-hidden whitespace-nowrap max-w-[18rem] lg:max-w-[25rem] xl:max-w-[35rem] break-words">
											<i>${replyMessage}</i>
										</p>
									</a>
									<p class="message-text bg-white transition-all-3ms dark:bg-slate-300 w-fit px-5 py-2 rounded-3xl rounded-bl-none whitespace-pre-line max-w-[18rem] lg:max-w-[25rem] xl:max-w-[35rem] break-words">${message}</p>
								</div>
								<i class="reply-message-btn bi bi-reply text-xl text-slate-400 ml-5 hidden transition-all-3ms cursor-pointer group-hover:block"></i>
							</div>
							<!-- date -->
							<div class="text-xs text-gray-500 dark:text-slate-400 transition-all-3ms">${date}</div>
						</div>
					</div>`;
	}

	// recipient template
	function contactRecipient(img, currentUser) {
		return `<div class="${currentUser} flex items-center py-3 rounded-lg pl-3 transition-all-3ms">
					<div class="w-12 h-12 mr-3 relative">
						<!-- profile -->
						<img src="${img}" class="w-12 h-12 rounded-full" alt="Profile">
						<!-- active indicator -->
						<div class="active absolute bg-slate-50 dark:bg-dark-primary transition-all-3ms bottom-0 right-0 translate-y-1/3 translate-x-1/4 rounded-full">
							<div class="w-3 h-3 bg-green-500 m-1 rounded-full"></div>
						</div>
					</div>
					<div class="w-9/12">
						<!-- name -->
						<h4 class="name font-bold dark:text-slate-200 transition-all-3ms">${currentUser}</h4>
						<!-- last message -->
						<!-- <p class="w-full whitespace-nowrap overflow-hidden text-ellipsis text-gray-500 text-sm dark:text-slate-400 transition-all-3ms">Lorem ipsum dolor sit amet consectetur adipisicing elit. Nostrum mollitia tempora, veritatis voluptatibus officia id quisquam esse culpa
							similique sapiente.</p> -->
					</div>
				</div>`;
	}

	// get current date
	function getDate() {
		var sentdate = new Date();
		return moment(sentdate).format("lll");
	}

	// get random number based in time to be sure that it will not repeat
	function getRandomNumberBasedInTime() {
		const d = new Date();
		return d.getTime();
	}

	function deleteSessionData(username) {
		let sessionData = JSON.parse(sessionStorage.getItem("contacts"));
		// identify if it has the same username in the sessionStorage, then remove the element in DOM
		// set a temporary element for the remaining session data or the remaining contacts
		let temp = [];
		for (const data of sessionData) {
			if (username === data.username) {
				$("." + username).remove();
			} else {
				// push the remaining contacts
				temp.push(data);
			}
		}
		// update the session
		sessionStorage.setItem("contacts", JSON.stringify(temp));
	}
	// set to session storage
	function setToSessionStorage(img, username) {
		// get and parse the stored data in sessionStorage, if there are no data set the variable to array
		let sessionData = JSON.parse(sessionStorage.getItem("contacts")) || [];

		// identify if it has the same username in the sessionStorage
		for (const data of sessionData) {
			if (username === data.username) {
				return false;
			}
		}

		// store data to an object
		let tempObj = {
			username,
			img,
		};

		// push data on the sessionData
		sessionData.push(tempObj);

		// set data on sessionStorage
		sessionStorage.setItem("contacts", JSON.stringify(sessionData));

		return true;
	}
});
