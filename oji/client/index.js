import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.DefaultLayout.onCreated(function() {
  this.autorun(() => {
    console.log(Orgs.find().fetch());
    
  });
})

Template.DefaultLayout.events({
  'click #logoutButton': function(event) {
    event.preventDefault();
    Meteor.logout();
    Router.go("/");
  }
});

Template.DefaultLayout.helpers({
  'userIsAdmin': () => Roles.userIsInRole(Meteor.userId(), 'admin'),

  'organization': () => Orgs.findOne(),
});