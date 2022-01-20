import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.signup.events({
    'click #signup-submit': function(event) {
        event.preventDefault();
        const user = $('#usernameSignin').val();
        const pass = $('#passwordSignin').val();
        const emailAddr = $('#emailSignin').val();
        const firstName = $('#firstnameSignin').val();
        const lastName = $('#lastnameSignin').val();
        const sex = $('#sex').val();
        const linkId = $('#linkId').val();
        Meteor.call('createNewUser', user, pass, emailAddr,firstName, lastName, sex, linkId, function(error, result){
            if(error){
                console.log(error);
            }
            else{
                Meteor.loginWithPassword($('#usernameSignin').val(), $('#passwordSignin').val());
                if($('#linkId').val()){
                    Router.go("/");
                }
                else{
                    Router.go("/createOrg")
                }
            }
        })
    },
    
});

