"use strict";

var ViewerController = {
  init: function vc_Init(remap) {
    this.remap = remap;
    this.currentStage = -1;
    this.maxStep = -1;
    this.steps = [];
  },


  removeBug: function vc_RemoveBug(index, bug) {
    // Remove from attachedBugs
    this.steps[this.currentStep].detachBugFromCset(index, bug);

    // Call in to viewer
    Viewer.removeBug(index, bug);
    Viewer.updateHelpText();
  },


  isValidBugNumber: function vc_IsValidBugNumber(input) {
    return Config.strictBugNumRE.test(input);
  },


  isValidEmail: function vc_IsValidBugNumber(input) {
    return Config.emailRE.test(input);
  },


  addBug: function vc_AddBug(index, bug) {
    UI.hideLoadingOverlay();
    var step = this.steps[this.currentStep];
    step.attachBugToCset(index, bug);
    Viewer.addBug(index, bug);
    Viewer.updateHelpText();
  },


  onCredentialsEntered: function vc_onCredentialsEntered(uname, pwd) {
    $('#username')[0].value = '';
    $('#password')[0].value = '';

    // Verify the email is valid
    uname = uname.trim();
    if (!this.isValidEmail(uname)) {
      UI.showInvalidEmailDialog();
      return;
    }

    // Create privileged loader
    var options = {username: uname, password: pwd}
    if (this.remap)
      options.test = true;

    var privLoader = bz.createClient(options);

    var privilegedUpdate = function(id, data, callback) {
      privLoader.updateBug(id, data, callback);
    }

    var privilegedLoad = function(id, callback) {
      privLoader.getBug(id, callback);
    }

    Step.privilegedUpdate = privilegedUpdate;
    Step.privilegedLoad = privilegedLoad;
    Step.username = uname;
    this.steps[this.currentStep].onCredentialsAcquired();
  },


  acquireCredentials: function vc_acquireCredentials() {
    UI.showCredentialsForm();
  },


  onAddBug: function vc_onAddBug(index, input) {
    UI.showLoadingOverlay();

    // Verify input is valid
    input = input.trim();
    if (!this.isValidBugNumber(input)) {
      UI.showInvalidBugDialog();
      return;
    }

    // Verify bug is not already attached
    if (this.steps[this.currentStep].isAttached(index, input)) {
      UI.hideLoadingOverlay();
      return;
    }

    // Check to see if we already have bug in BugData
    if (input in BugData.bugs) {
      this.addBug(index, input);
      return;
    }

    // Kick off load if not
    var self = this;
    var loadCallback = function() {
      self.addBug(index, input);
    };
    BugData.load(input, loadCallback, null);
  },


  onChangeBug: function vc_onAddBug(index, bug, input) {
    UI.showLoadingOverlay();

    // Verify input is valid
    input = input.trim();
    if (!this.isValidBugNumber(input)) {
      UI.showInvalidBugDialog();
      return;
    }

    // Verify it's not the same!
    if (bug == input) {
      UI.hideLoadingOverlay();
      Viewer.addChangeButtonListener(cset, bug);
      return;
    }

    // If the new bug number is already attached, just delete the old one
    if (this.steps[this.currentStep].isAttached(index, input)) {
      UI.hideLoadingOverlay();
      this.removeBug(index, bug);
      return;
    }

    // Check to see if we already have bug in BugData.bugs
    if (input in BugData.bugs) {
      this.addBug(index, input);
      this.removeBug(index, bug);
      return;
    }

    // Kick off load if not
    var self = this;
    var loadCallback = function() {
      self.addBug(index, input);
      self.removeBug(index, bug);
    };
    BugData.load(input, loadCallback, null);
  },


  onCommentCheckClick: function vc_onCommentCheckClick(index, bug, newVal) {
    this.steps[this.currentStep].setShouldComment(index, bug, newVal);
    Viewer.updateSubmitButton();
  },


  onResolveCheckClick: function vc_onResolveCheckClick(bug, newVal) {
    this.steps[this.currentStep].setShouldResolve(bug, newVal);
    Viewer.updateSubmitButton();
  },


  onCommentInput: function vc_onCommentInput(index, bug, newVal) {
    this.steps[this.currentStep].setComment(index, bug, newVal);
  },


  onMilestoneChange: function vc_onMilestoneChange(bug, newVal) {
    this.steps[this.currentStep].setMilestone(bug, newVal);
  },


  postSubmitUpdate: function vc_postSubmitUpdate(index, bug) {
    Viewer.removeBug(index, bug);
    Viewer.addBug(index, bug);
  },


  addStep: function vc_addStage(name, isBackedOut) {
    var step;

    var callbacks = {credentialsCallback: this.acquireCredentials,
                     uiUpdate: this.postSubmitUpdate};

    step = new Step(name, callbacks, isBackedOut);

    var index = this.steps.push(step) - 1;
    this.maxStep = this.steps.length;
    step.setStepNumber(index + 1);
    for (var i = 0; i < this.maxStep; i++)
      this.steps[i].setMaxStepNumber(this.maxStep);
  },


  onPrevious: function vc_onPrevious() {
    this.viewStep(this.currentStep - 1);
  },


  onNext: function vc_onNext() {
    this.viewStep(this.currentStep + 1);
  },


  viewStep: function vc_viewStep(stepIndex) {
    this.currentStep = stepIndex;
    if (stepIndex == this.maxStep) {
      this.viewSummary();
      return;
    }

    var step = this.steps[this.currentStep];
    var self = this;
    var onPreviousFn = function() {
      self.onPrevious();
    };
    var onPrevious = {label: 'Previous', fn: onPreviousFn};
    if (stepIndex == 0)
      onPrevious.fn = null;

    var onNextfn = function() {
      self.onNext();
    };
    var onNext = {label: 'Next', fn: onNextfn};
    if (stepIndex == (this.maxStep - 1))
      onNext.label = 'Summary';

    Viewer.view(step, onPrevious, onNext);
  },


  viewSummary: function vc_viewSummary() {
    var self = this;
    var onPreviousFn = function() {
      self.onPrevious();
    };
    var onPrevious = {label: 'Previous', fn: onPreviousFn};

    var onNextfn = function() {
      self.onNext();
    };
    var onNext = {label: 'Next', fn: null};

    Summary.view(this.steps, onPrevious, onNext);
  }
};