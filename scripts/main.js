'use strict';

/** Main ClassChat Application */
function ClassChat() {

  /* Check that Firebase SDK config is valid */
  this.checkSetup();

  /* Shortcuts to DOM Elements */
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.signInSnackbar = document.getElementById('must-signin-snackbar');

  /* Event handlers for the sign in/out buttons */
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

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
    this.displayMessage(data.key, val.name, val.text, val.photoUrl);
  }.bind(this);
  this.messagesRef1.on('child_added', setMessage1);
  this.messagesRef1.on('child_changed', setMessage1);
};

/** Saves a new message to the Firebase DB */
ClassChat.prototype.saveMessage = function(e) {

  /* By default, clicking a submit button refreshes the page - we don't want this! */
  e.preventDefault();

  var thread_id = e.data.key;
  // Not using jQuery here because the forward slash is not allowed in the selector
  var $message_input = $(document.getElementById(thread_id + '/message'));
  var $submit_button = $(document.getElementById(thread_id + '/submit'));

  /* Check that the user entered a message and is signed in */
  if ($message_input.val() !== '' && this.checkSignedInWithMessage()) {

    /* Shortcut for current user */
    var currentUser = this.auth.currentUser;

    console.log(thread_id + ': ' + $message_input.val());

    this.threadsRef.child(thread_id).child('messages').push({
    // this.database.ref('threads').child(thread_id).child('messages').push({
      name: currentUser.displayName,
      text: $message_input.val(),
      photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
    }).then(function() {
      /* Clear message text field and SEND button state */
      ClassChat.resetMaterialTextfield($message_input[0]);
      $submit_button.prop('disabled', true);

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
    var $question_thread = $($.parseHTML(ClassChat.QUESTION_THREAD));
    $question_thread.attr('id', key);

    var $question_thread_title = $question_thread.find('.mdl-card__title-text');
    $question_thread_title.text(title);

    var $thread_messages = $question_thread.find('.messages');
    $thread_messages.attr('id', key + '/messages');

    var $thread_form = $question_thread.find('form');
    $thread_form.attr('id', key + '/message-form');

    var $thread_form_input = $question_thread.find('input');
    $thread_form_input.attr('id', key + '/message');

    var $thread_form_label = $question_thread.find('label');
    $thread_form_label.attr('for', key + '/message');

    var $thread_button = $question_thread.find('button');
    $thread_button.attr('id', key + '/submit');

    /* Only enable the submit button when the input field is non-empty */
    $thread_form_input.bind('keyup change', {param1: $thread_form_input, param2: $thread_button}, function(e) {

      var $input = e.data.param1;
      var $button = e.data.param2;

      if ($input.val() !== '') {
        $button.prop('disabled', false);
      } else {
        $button.prop('disabled', true);
      }
    });

    $thread_button.click({key: key}, this.saveMessage.bind(this));

    /* Material Design Lite needs to upgrade this element */
    var $thread_textfield = $question_thread.find('.mdl-textfield');
    componentHandler.upgradeElement($thread_textfield[0], 'MaterialTextfield');

    $question_thread.appendTo('#question-threads-container');
  }
};

/** Displays a Message in the UI */
ClassChat.prototype.displayMessage = function(key, name, text, picUrl) {
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
