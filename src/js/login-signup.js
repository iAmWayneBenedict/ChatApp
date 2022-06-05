$(() => {

	// toggle avatar choices popup
	$(".profile-btn").click(function () {
		$(".avatar-row").toggleClass("hidden");
		$(".avatar-row").toggleClass("flex");
	});

	// click the avatar
	$(".avatar-row").click((event) => {
		if (event.target.tagName === "IMG") {
			// set src to the hidden input
			$("#avatar").val(event.target.src);
			// display chosen img
			$(".avatar-img").attr("src", event.target.src);
			$(".avatar-row").addClass("hidden");
			$(".avatar-row").removeClass("flex");
		}
	});
	// on submit signup
	$("#signup-form").submit(function (event) {
		event.preventDefault();
		
		let password = parseInt($("#password").val().length);
		let conirmPassword = parseInt($("#confirm-password").val().length);

		// if the password and confirm password are below 8 characters then notify the user
		if (password < 8 || conirmPassword < 8) {
			alert("Password must be atleast 8 characters!");
			return;
		} else if ($("#password").val() !== $("#confirm-password").val()) {
			// if the password and confirm password doesnt match each other then notify the user
			alert("Password doesn't match!");
			return;
		}

		// set the data to localstorage
		if (!setToLocalStorage($(this).serializeArray())) {
			console.log(setToLocalStorage($(this).serializeArray()))
			return;
		}

		// variables for session
		let img = $(this).serializeArray()[0].value;
		let username = $(this).serializeArray()[1].value;
		let pass = $(this).serializeArray()[2].value;

		// save to sessionStorage
		sessionStorage.setItem("user", JSON.stringify({ img, username, pass }));
		event.target.reset();

		// notify the user when successful signup
		alert("Successfully created your account!\n Please login!");
	});

	// on submit login form
	$("#login-form").submit(function (event) {
		event.preventDefault();

		let password = parseInt($("#signin-password").val().length);
		let formData = $(this).serializeArray();

		// alert if the password is less than 8
		if (password < 8) {
			alert("Password must be atleast 8 characters!");
			return;
		}

		// get and parse the stored data in localStorage
		let localData = JSON.parse(localStorage.getItem("user"));

		// get and parse the stored data in localStorage
		let sessionData = JSON.parse(sessionStorage.getItem("user"));

		// if session is not empty, then verify if the user has data in session
		if (sessionData) {
			if (
				sessionData.username === formData[0].value &&
				sessionData.pass === formData[1].value &&
				sessionData
			) {
				// reset form
				event.target.reset();

				// if it already has data, redirect to main page
				location.href = "http://localhost/ChatApp/views/index.html";
				return;
			}
		}

		// identify if it has the same username in the username and password are correct
		for (const lData of localData) {
			if (
				formData[0].value === lData.username &&
				formData[1].value === lData.data.pass
			) {
				// variables for session
				let img = lData.data.img;
				let username = formData[0].value;
				let pass = formData[1].value;

				//set data to session storage
				sessionStorage.setItem(
					"user",
					JSON.stringify({ img, username, pass })
				);

				// reset form
				event.target.reset();

				//redirect to main page
				location.href = "http://localhost/ChatApp/views/index.html";
				return;
			}
		}

		// alert if username and password doesnt match
		alert("Incorrect username or password!");
	});

	function setToLocalStorage(formData) {
		let img = formData[0].value;
		let username = formData[1].value;
		let pass = formData[2].value;

		// get and parse the stored data in localStorage, if there are no data set the variable to array
		let localData = JSON.parse(localStorage.getItem("user")) || [];

		// identify if it has the same username in the localstorage
		for (const data of localData) {
			if (username === data.username) {
				alert("User already have an account!");
				return false;
			}
		}

		// store data to an object
		let tempObj = {
			username,
			data: {
				img,
				pass,
			},
		};

		// push data on the localData
		localData.push(tempObj);

		// set data on localStorage
		localStorage.setItem("user", JSON.stringify(localData));
		return true;
	}
});
