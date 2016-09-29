'use strict';

/** Main ClassChat Application */
function ClassChat() {

  /* Check that Firebase SDK config is valid */
  this.checkSetup();

  /* Shortcuts to DOM Elements */
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');
  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  /* Event listeners for saving a message, signing in, and signing out */
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

  /* Event listeners for toggling the "Send" button */
  var buttonTogglingHandler = this.toggleButton.bind(this);
  this.messageInput.addEventListener('keyup', buttonTogglingHandler);
  this.messageInput.addEventListener('change', buttonTogglingHandler);

  /* Event listeners for uploading images */
  this.submitImageButton.addEventListener('click', function() {
    this.mediaCapture.click();
  }.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));

  /* Initialise a Firebase connection */
  this.initFirebase();
}

/** Sets up shortcuts to Firebase features and initiate firebase auth */
ClassChat.prototype.initFirebase = function() {

  /* Shortcuts to Firebase SDK features */
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();

  /* Initiates Firebase auth and listen to auth state changes */
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

/** Loads chat messages history and listens for upcoming ones */
ClassChat.prototype.loadMessages = function() {

  /* Reference to the /messages/ database path */
  this.messagesRef = this.database.ref('messages');

  /* Make sure we remove all previous listeners */
  this.messagesRef.off();

  /* Load the last 12 messages and listen for new ones */
  var setMessage = function(data) {
    var val = data.val();
    this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
  }.bind(this);
  this.messagesRef.on('child_added', setMessage);
  this.messagesRef.on('child_changed', setMessage);
};

/** Saves a new message to the Firebase DB */
ClassChat.prototype.saveMessage = function(e) {

  /* By default, submits the form and refreshes the page - we don't want this! */
  e.preventDefault();

  /* Check that the user entered a message and is signed in */
  if (this.messageInput.value && this.checkSignedInWithMessage()) {

    /* Shortcut for current user */
    var currentUser = this.auth.currentUser;

    /* Add a new message entry to the Firebase Database */
    this.messagesRef.push({
      name: currentUser.displayName,
      text: this.messageInput.value,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function() {
      /* Clear message text field and SEND button state */
      ClassChat.resetMaterialTextfield(this.messageInput);
      this.toggleButton();
    }.bind(this)).catch(function(error) {
      console.error('Error writing new message to Firebase Database', error);
    });
  }
};

/** Sets the URL of the given img element with the URL of the image stored in Firebase Storage */
ClassChat.prototype.setImageUrl = function(imageUri, imgElement) {

  /* If the image is a Firebase Storage URI we fetch the URL */
  if (imageUri.startsWith('gs://')) {
    imgElement.src = ClassChat.LOADING_IMAGE_URL; // Display a loading image first.
    this.storage.refFromURL(imageUri).getMetadata().then(function(metadata) {
      imgElement.src = metadata.downloadURLs[0];
    });
  } else {
    imgElement.src = imageUri;
  }
};

// TODO - probably don't need this functionality
/** Saves a new message containing an image URI in Firebase - first saves the image in Firebase storage */
ClassChat.prototype.saveImageMessage = function(event) {

  /* The image file that is to be uploaded */
  var file = event.target.files[0];

  /* Clear the selection in the file picker input */
  this.imageForm.reset();

  /* Check if the file is an image */
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return;
  }

  /* Check if the user is signed in */
  if (this.checkSignedInWithMessage()) {

    /* We add a message with a loading icon that will get updated with the shared image */
    var currentUser = this.auth.currentUser;
    this.messagesRef.push({
      name: currentUser.displayName,
      imageUrl: ClassChat.LOADING_IMAGE_URL,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function(data) {

      // Upload the image to Firebase Storage.
      var uploadTask = this.storage.ref(currentUser.uid + '/' + Date.now() + '/' + file.name)
          .put(file, {'contentType': file.type});
      // Listen for upload completion.
      uploadTask.on('state_changed', null, function(error) {
        console.error('There was an error uploading a file to Firebase Storage:', error);
      }, function() {

        // Get the file's Storage URI and update the chat message placeholder.
        var filePath = uploadTask.snapshot.metadata.fullPath;
        data.update({imageUrl: this.storage.ref(filePath).toString()});
      }.bind(this));
    }.bind(this));
  }
};

/** Signs in the user using Google OAuth */
ClassChat.prototype.signIn = function() {
  /* Sign in using popup auth and Google as the identity provider */
  var provider = new firebase.auth.GoogleAuthProvider();
  this.auth.signInWithPopup(provider);
};

/** Signs-out of Friendly Chat */
ClassChat.prototype.signOut = function() {
  /* Sign out of Firebase */
  this.auth.signOut();
};

/** Triggers when the auth state changes e.g. when the user signs in or out */
ClassChat.prototype.onAuthStateChanged = function(user) {

  if (user) { // User is signed in
    /* Get profile pic and user's name from the Firebase user object */
    var profilePicUrl = user.photoURL;
    var userName = user.displayName;

    /* Set the user's profile pic and name */
    this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
    this.userName.textContent = userName;

    /* Show user's profile and sign-out button */
    this.userName.removeAttribute('hidden');
    this.userPic.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');

    /* Hide sign-in button */
    this.signInButton.setAttribute('hidden', 'true');

    /* We load currently existing chat messages */
    this.loadMessages();
  } else { // user is signed out
    /* Hide user's profile and sign-out button */
    this.userName.setAttribute('hidden', 'true');
    this.userPic.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');

    /* Show sign-in button */
    this.signInButton.removeAttribute('hidden');
  }
};

/** Returns true if user is signed in. Otherwise false and displays a message */
ClassChat.prototype.checkSignedInWithMessage = function() {

  /* Return true if the user is signed in Firebase */
  if (this.auth.currentUser) {
    return true;
  }

  /* Display a message to the user using a Snackbar */
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
  return false;
};

/** Resets the given MaterialTextField */
ClassChat.resetMaterialTextfield = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

/** HTML template for chat messages */
ClassChat.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';

/** A loading image URL */
ClassChat.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

/** Displays a Message in the UI */
ClassChat.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
  var div = document.getElementById(key);
  /* If an element for that message does not exists yet we create it */
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = ClassChat.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');
  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUri) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }.bind(this));
    this.setImageUrl(imageUri, image);
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in.
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.messageList.scrollTop = this.messageList.scrollHeight;
  this.messageInput.focus();
};

/** Enables or disables the submit button depending whether the text input field has content or not */
ClassChat.prototype.toggleButton = function() {
  if (this.messageInput.value) {
    this.submitButton.removeAttribute('disabled');
  } else {
    this.submitButton.setAttribute('disabled', 'true');
  }
};

/** Checks that the Firebase SDK has been correctly setup and configured */
ClassChat.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !window.config) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions.');
  } else if (config.storageBucket === '') {
    window.alert('Your Firebase Storage bucket has not been enabled. Sorry about that. This is ' +
        'actually a Firebase bug that occurs rarely. ' +
        'Please go and re-generate the Firebase initialisation snippet (step 4 of the codelab) ' +
        'and make sure the storageBucket attribute is not empty. ' +
        'You may also need to visit the Storage tab and paste the name of your bucket which is ' +
        'displayed there.');
  }
};

/** Initialise the Application */
window.onload = function() {
  window.friendlyChat = new ClassChat();
};
