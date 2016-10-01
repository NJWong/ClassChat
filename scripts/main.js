'use strict';

/** Main ClassChat Application */
function ClassChat() {

  /* Check that Firebase SDK config is valid */
  this.checkSetup();

  /* Shortcuts to DOM Elements */

  // TODO make these not hard coded later
  this.messageList1 = document.getElementById('thread_1_id/messages');
  this.messageForm1 = document.getElementById('thread_1_id/message-form');
  this.messageInput1 = document.getElementById('thread_1_id/message');
  this.submitButton1 = document.getElementById('thread_1_id/submit');

  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');
  this.questionThreadsContainer = document.getElementById('question-threads-container')

  /* Event listeners for saving a message, signing in, and signing out */
  // TODO make these not hard coded later
  // this.messageForm1.addEventListener('submit', this.saveMessage1.bind(this));
  //
  // this.signOutButton.addEventListener('click', this.signOut.bind(this));
  // this.signInButton.addEventListener('click', this.signIn.bind(this));

  /* Event listeners for toggling the "Send" button */
  var buttonTogglingHandler = this.toggleButton.bind(this);

  // TODO make these not hard coded later
  // this.messageInput1.addEventListener('keyup', buttonTogglingHandler);
  // this.messageInput1.addEventListener('change', buttonTogglingHandler);

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

ClassChat.prototype.loadThreads = function() {
  /* Threads */
  this.threadsRef = this.database.ref('threads');

  /* Make sure we remove all previous listeners */
  this.threadsRef.off();

  /* Create a thread */
  var setThread = function(data) {
    var val = data.val();
    this.displayThread(data.key, val.title);

  }.bind(this);
  this.threadsRef.on('child_added', setThread);
  this.threadsRef.on('child_changed', setThread);
};

/** Loads chat messages history and listens for upcoming ones */
ClassChat.prototype.loadMessages = function() {

  /* Reference to the /messages/ database path */
  // this.messagesRef = this.database.ref('messages');
  this.messagesRef1 = this.database.ref('threads/thread_1_id/messages');

  /* Make sure we remove all previous listeners */
  this.messagesRef1.off();

  /* Load the last 12 messages and listen for new ones */
  var setMessage1 = function(data) {
    var val = data.val();
    this.displayMessage1(data.key, val.name, val.text, val.photoUrl);
  }.bind(this);
  this.messagesRef1.on('child_added', setMessage1);
  this.messagesRef1.on('child_changed', setMessage1);
};

/** Saves a new message to the Firebase DB */
ClassChat.prototype.saveMessage1 = function(e) {

  /* By default, submits the form and refreshes the page - we don't want this! */
  e.preventDefault();

  /* Check that the user entered a message and is signed in */
  if (this.messageInput1.value && this.checkSignedInWithMessage()) {

    /* Shortcut for current user */
    var currentUser = this.auth.currentUser;



    /* Add a new message entry to the Firebase Database */
    // TODO - make sure we push to the right thread
    // this.messagesRef.push({
    this.threadsRef.child('thread_1_id').child('messages').push({
      name: currentUser.displayName,
      text: this.messageInput1.value,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function() {
      /* Clear message text field and SEND button state */
      ClassChat.resetMaterialTextfield(this.messageInput1);
      this.toggleButton();
    }.bind(this)).catch(function(error) {
      console.error('Error writing new message to Firebase Database', error);
    });
  }
};

ClassChat.prototype.saveMessage2 = function(e) {

  /* By default, submits the form and refreshes the page - we don't want this! */
  e.preventDefault();

  /* Check that the user entered a message and is signed in */
  if (this.messageInput2.value && this.checkSignedInWithMessage()) {

    /* Shortcut for current user */
    var currentUser = this.auth.currentUser;



    /* Add a new message entry to the Firebase Database */
    // TODO - make sure we push to the right thread
    this.threadsRef.child('thread_2_id').child('messages').push({
      name: currentUser.displayName,
      text: this.messageInput2.value,
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function() {
      /* Clear message text field and SEND button state */
      ClassChat.resetMaterialTextfield(this.messageInput2);
      this.toggleButton();
    }.bind(this)).catch(function(error) {
      console.error('Error writing new message to Firebase Database', error);
    });
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
    this.loadThreads();
    // this.loadMessages();


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
ClassChat.resetMaterialTextfield1 = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

ClassChat.resetMaterialTextfield2 = function(element) {
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

/** HTML template for a question thread */
ClassChat.QUESTION_THREAD =
'<div class="messages-card-container mdl-cell mdl-cell--12-col mdl-grid">' +
  '<div class="messages-card mdl-card mdl-shadow--2dp mdl-cell mdl-cell--12-col">' +
    '<div class="mdl-card__title">' +
      '<h2 class="mdl-card__title-text">Discuss quiz below...</h2>' +
    '</div>' +
    '<div class="mdl-card__supporting-text mdl-color-text--grey-600">' +
      '<div class="messages">' +
        '<span class="message-filler"></span>' +
      '</div>' +
      '<form class="message-form" autocomplete="off" action="#">' +
        '<div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">' +
          '<input class="mdl-textfield__input" type="text">' +
          '<label class="mdl-textfield__label">Message...</label>' +
        '</div>' +
        '<button disabled type="submit" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">Send</button>' +
      '</form>' +
    '</div>' +
  '</div>' +
'</div>';

/** A loading image URL */
ClassChat.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

ClassChat.prototype.displayThread = function(key, title) {
  var div = document.getElementById(key);

  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = ClassChat.QUESTION_THREAD;

    var messages_card_container = container.firstChild;
    messages_card_container.setAttribute('id', key);

    var messages_card = messages_card_container.firstChild;

    var thread_title_text = messages_card.firstChild.firstChild;
    thread_title_text.innerHTML = title;

    var thread_content = messages_card.childNodes[1];

    var messages_section = thread_content.childNodes[0];
    messages_section.setAttribute('id', key + '/messages');

    var thread_form = thread_content.childNodes[1];
    thread_form.setAttribute('id', key + '/message-form');

    var form_textfield = thread_form.childNodes[0];
    componentHandler.upgradeElement(form_textfield, 'MaterialTextfield');
    // componentHandler.upgradeAllRegistered();

    var form_input = form_textfield.childNodes[0];
    form_input.setAttribute('id', key + '/message');

    var form_label = form_textfield.childNodes[1];
    form_label.setAttribute('for', key + '/message');

    var form_button = thread_form.childNodes[1];
    form_button.setAttribute('id', key + '/submit');

    this.questionThreadsContainer.appendChild(container);
  }
};

/** Displays a Message in the UI */
ClassChat.prototype.displayMessage1 = function(key, name, text, picUrl) {
  var div = document.getElementById(key);
  /* If an element for that message does not exists yet we create it */
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = ClassChat.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList1.appendChild(div);
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
  }
  // Show the card fading-in.
  setTimeout(function() {div.classList.add('visible')}, 1);
  this.messageList1.scrollTop = this.messageList1.scrollHeight;
  this.messageInput1.focus();
};

/** Enables or disables the submit button depending whether the text input field has content or not */
ClassChat.prototype.toggleButton = function() {
  if (this.messageInput1.value) {
    this.submitButton1.removeAttribute('disabled');
  } else {
    this.submitButton1.setAttribute('disabled', 'true');
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
