Template.moduleCenter.helpers({
    'modules': function(){
        mod = Modules.find({}).fetch()
        return mod;
    },
    'classes':function(){
        classList = Meteor.user().classList || [];
        if(!classList){
            return false
        } else {
            classes = [];
            for(let course of classList){
                classId = course.classId;
                thisClass = Classes.findOne({"_id":classId});
                thisClass.hasModules = true;
                if(thisClass.flow.length == 0){
                    thisClass.hasModules = false;
                }
                thisClass.moduleList = [];
                classes.push(thisClass);
            }
            console.log(classes);
            return classes;
        }
    }
})
Template.moduleCenter.events({
    'click .startModule': function(event){
        event.preventDefault();
        //get data-module
        let moduleId = event.target.getAttribute("id");
        target = "/module/" + moduleId;
        window.location.href = target;
        Router.go(target);
    },
})
Template.moduleCenter.onCreated(function() {
    Meteor.subscribe('modules');
    Meteor.subscribe('getClasses');
})