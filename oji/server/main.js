import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles
import { calculateScores } from './subscaleCalculations.js';


const SEED_ADMIN = {
    username: 'testAdmin',
    password: 'password',
    email: 'testAdmin@memphis.edu',
    firstName: 'Johnny',
    lastName: 'Test',
    org : "",
    supervisorID: "0",
    role: 'admin',
    supervisorInviteCode: "12345",
    sex: 'female',
    assigned: []
};
const SEED_SUPERVISOR = {
    username: 'testSupervisor',
    password: 'password',
    email: 'testSupervisor@memphis.edu',
    firstName: 'Supervisor',
    lastName: 'Test',
    org : "",
    supervisorID: "0",
    role: 'supervisor',
    supervisorInviteCode: "12345",
    sex: 'male',
    assigned: []
};
const SEED_USER = {
    username: 'testUser',
    password: 'password',
    email: 'testUser@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : "",
    supervisorID: "0",
    role: 'user',
    supervisorInviteCode: null,
    sex: 'female',
    assigned: [],
    hasCompletedFirstAssessment: false
};
const SEED_USER2 = {
    username: 'testUserNotInIIS',
    password: 'password',
    email: 'testUserNotInIIS@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : "alksdjhfaslkd",
    supervisorID: "0",
    role: 'user',
    supervisorInviteCode: null,
    sex: 'male',
    assigned: [],
    hasCompletedFirstAssessment: false
};
const SEED_USERS = [SEED_ADMIN, SEED_SUPERVISOR, SEED_USER, SEED_USER2];
const SEED_ROLES = ['user', 'supervisor', 'admin']


Meteor.startup(() => {
    
    //Iron Router Api
    Router.route('/api',{
    where: "server",
    action: function (){
        this.response.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        console.log(this.request.headers);
        username = this.request.headers['x-user-id'];
        loginToken = this.request.headers['x-auth-token'];
        user = Meteor.users.findOne({username: username});
        isTokenExpired = true;
        keys = user.api;
        now = new Date();
        expDate = keys.expires;
        expDate.setDate(expDate.getDate());
        console.log('date', now, expDate, keys.expires);
        if(now < expDate){
            isTokenExpired = false;
        }
        if(!user || user.api.token != loginToken || isTokenExpired == true){
            this.response.end("{sucess: false, message: 'incorrect username or expired token'}");
        } else {
            organization = Orgs.findOne({orgOwnerId: user._id});
            userlist = Meteor.users.find({organization: organization._id}, {
                fields: {
                    firstname: 0,
                    lastname: 0,
                    emails: 0,
                    username: 0,
                    role: 0,
                    supervisorInviteCode: 0,
                    services: 0,
                    organization: 0,
                    api: 0
                },
            }).fetch();
            userListResponse = []
            for(i = 0; i < userlist.length; i++){
                userTrials = Trials.find({userId: userlist[i]._id}).fetch();
                userModules = Modules.find({userId: userlist[i]._id}).fetch();
                curUser = userlist[i];
                curUser.trials = JSON.parse(JSON.stringify(userTrials));
                curUser.modules = JSON.parse(JSON.stringify(userModules));
                userListResponse.push(curUser);
            }
            organization.users = userListResponse;
            this.response.end(JSON.stringify(organization));
            }
        }
  });

    //load default JSON assessment into mongo collection
    if(Assessments.find().count() === 0){
        console.log('Importing Default Assessments into Mongo.')
        var data = JSON.parse(Assets.getText('defaultAssessments.json'));
        for (var i =0; i < data['assessments'].length; i++){
            assessment = data['assessments'][i]['assessment'];
            Assessments.insert(assessment);
        };
    }

    //load default JSON modules into mongo collection
    if(Modules.find().count() === 0){
        console.log('Importing Default Modules into Mongo.')
        var data = JSON.parse(Assets.getText('defaultModules.json'));
        for (var i =0; i < data['modules'].length; i++){
            newModule = data['modules'][i]['module'];
            Modules.insert(newModule);
        };
    }

    //create seed roles
    for(let role of SEED_ROLES){
        if(!Meteor.roles.findOne({ '_id' : role })){
            Roles.createRole(role);
        }
    }
    let newOrgId;
    //create seed user
    for(let user of SEED_USERS){
        if (!Accounts.findUserByUsername(user.username)) {
            const uid = Accounts.createUser({
                username: user.username,
                password: user.password,
                email: user.email,
            });
            
            addUserToRoles(uid, user.role);
            if(user.role == "admin"){
                Orgs.insert({
                    orgName: "IIS",
                    orgOwnerId: uid,
                    orgDesc: "Testing",
                    newUserAssignments: []
                });
                newOrgId = Orgs.findOne({orgOwnerId: uid})._id;
                const d = new Date();
                let month = d.getMonth(); 
                let day = d.getDate();
                let year = d.getFullYear();
                let title = "test event";
                Events.insert({
                    type: "org",
                    org: newOrgId,
                    month: month,
                    day: day,
                    year: year,
                    title: title,
                    createdBy: uid
                });
                Meteor.call('generateInvite',uid);
            }

            let supervisorID = '';
            if(user.username == 'testUser'){
                supervisorID =  Accounts.findUserByUsername(SEED_SUPERVISOR.username)._id;
            }
            Meteor.users.update({ _id: uid }, 
                {   $set:
                    {
                        sex: user.sex,
                        firstname: user.firstName,
                        lastname: user.lastName,
                        supervisor: supervisorID,
                        organization: user.org ? user.org: newOrgId,
                        sex: user.sex,
                        assigned: user.assigned,
                        hasCompletedFirstAssessment: user.hasCompletedFirstAssessment
                    }
                }
            );
        }
    }
});

//Global Methods
Meteor.methods({
    getInviteInfo,
    createNewUser: function(user, pass, emailAddr, firstName, lastName, sex, gender, linkId=""){
        if(linkId){
            var {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName} = getInviteInfo(linkId);    
            var organization = Orgs.findOne({_id: targetOrgId});          
        } else {
            var targetOrgId = null
            var targetSupervisorId = null;  
            var organization = {newUserAssignments: []};   
        }
        if (!Accounts.findUserByUsername(user)) {
            if (!Accounts.findUserByEmail(emailAddr)){
                const uid = Accounts.createUser({
                    username: user,
                    password: pass,
                    email: emailAddr
                });
                Meteor.users.update({ _id: uid }, 
                    {   $set: 
                        {
                            sex: sex,
                            firstname: firstName,
                            lastname: lastName,
                            organization: targetOrgId,
                            supervisor: targetSupervisorId,
                            supervisorInviteCode: null,
                            hasCompletedFirstAssessment: false,
                            gender: gender,
                            assigned: organization.newUserAssignments || []
                        }
                    });
                if(linkId != ""){
                    addUserToRoles(uid, 'user');
                } else {
                    addUserToRoles(uid, 'admin');
                }
            }
            else{
                throw new Meteor.Error ('user-already-exists', `Email ${emailAddr} already in use`);
            }
        }
        else{
            throw new Meteor.Error ('user-already-exists', `User ${user} already exists`);
        }
    },
    createOrganization: function(newOrgName, newOrgOwner, newOrgDesc){
        allAssessments = Assessments.find().fetch();
        newUserAssignments = [];
        for(i=0; i<allAssessments.length; i++){
            newUserAssignments.push(allAssessments[i]._id);
        }
        Orgs.insert({
            orgName: newOrgName,
            orgOwnerId: newOrgOwner,
            orgDesc: newOrgDesc,
            newUserAssignments: newUserAssignments
        });
        newOrgId = Orgs.findOne({orgOwnerId: newOrgOwner})._id;
        Meteor.users.update({ _id: newOrgOwner }, 
            {   $set: 
                {
                    organization: newOrgId,
                }
            });
        return true;
    },
    generateInvite: function(supervisorId){
        var link = '';
        var length = 16;
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        var unique = false;
        while(unique == false){;
            for ( var i = 0; i < length; i++ ) {
                link += characters.charAt(Math.floor(Math.random() * charactersLength));
            }  
            linkFound = Meteor.users.find({supervisorInviteCode: link}).fetch().length; 
            if(linkFound == 0){
                unique = true;
            } else {
                link = "";
            }
        }
        Meteor.users.update({ _id: supervisorId }, 
        {   $set: 
            {
                supervisorInviteCode: link
            }
        });
        return link;
    },
    destroyUser: function(userID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){
            Meteor.users.remove(userID);
        }
    },
    removeSupervisor: function(userId){
        //removes a user from supervisors list if added by mistake. 
        if(Roles.userIsInRole(this.userId, 'admin')){
            addUserToRoles(userId, 'user');
            removeUserFromRoles(userId, 'supervisor');
        }
    },
    editSupervisor: function(supervisorID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){

        }
    },
    addSupervisor: function(userId) {
        //elevate user with user role to supervisor
        if(Roles.userIsInRole(this.userId, 'admin')){
            addUserToRoles(userId, 'supervisor');
            removeUserFromRoles(userId, 'user');
        }
    },
    changeAssignmentToNewUsers: function(assignment){
        Orgs.upsert({_id: Meteor.user().organization},{$set: {newUserAssignments: assignment}});
    },
    assignToAllUsers: function(assignment){
        org = Meteor.user().organization;
        allUsers = Meteor.users.find({organization: org, role: 'user'}).fetch();
        for(i = 0; i < allUsers.length; i++){
            curAssignments = allUsers[i].assigned;
            if(!curAssignments.includes(assignment)){
                curAssignments.push(assignment);
            }
            Meteor.users.upsert({_id: allUsers[i]._id}, {$set: {assigned: curAssignments}});
        }
    },
    changeAssignmentOneUser: function(input){
        userId = input[0];
        assignment = input[1];
        Meteor.users.upsert({_id: userId},{$set: {assigned: assignment}});
    },

    //assessment data collection
    saveAssessmentData: function(newData){
        trialId = newData.trialId;
        assessmentId = newData.assessmentId
        assessmentName = newData.assessmentName
        userId = Meteor.userId();
        questionId = newData.questionId;
        oldResults = Trials.findOne({_id: trialId});
        let identifier;
        
        if(typeof oldResults === "undefined"){
            data = [];
            subscaleTotals = {};
            identifier = newData.identifier;
        } else {
            data = oldResults.data;
            subscaleTotals = oldResults.subscaleTotals;
            identifier = oldResults.identifier;
        }
        data[newData.questionId] = {
            response: newData.response,
            responseValue: newData.responseValue,
            subscales: newData.subscales
        }
        //sum the response values by subscale for data reporting
        if(!newData.subscales){
            //current assessment doesnt use subscales, just tally the totalls
            if(subscaleTotals['default']){
                subscaleTotals['default'] += newData.responseValue;
            }
            else{
                subscaleTotals['default'] = newData.responseValue;
            }
        }
        for(let subscale of newData.subscales){
            if(subscaleTotals[subscale]){
                subscaleTotals[subscale] += newData.responseValue;
            }
            else{
                subscaleTotals[subscale] = newData.responseValue;
            }
        }
        var output = Trials.upsert({_id: trialId}, {$set: {userId: userId, assessmentId: assessmentId, assessmentName: assessmentName, lastAccessed: new Date(), identifier: identifier, data: data, subscaleTotals: subscaleTotals}});

        if(typeof output.insertedId === "undefined"){
            Meteor.users.update(userId, {
                $set: {
                  curTrial: {
                      trialId: trialId,
                      questionId: questionId + 1
                  }
                }
              });
            return trialId;
        } else {
            Meteor.users.update(userId, {
                $set: {
                    curTrial: {
                        trialId: output.insertedId,
                        questionId: 1
                    }
                }
              });
            return output.insertedId;
        }
    },
    endAssessment: function(trialId) {
        let trial = Trials.findOne({'_id': trialId});
        const adjustedScores = calculateScores(trial.identifier, trial.subscaleTotals, Meteor.user().sex)
        if(adjustedScores)
            Trials.upsert({_id: trialId}, {$set: {subscaleTotals: adjustedScores}});
    },
    clearAssessmentProgress: function (){
        userId = Meteor.userId();

        Meteor.users.update(userId, {
            $set: {
              curTrial: {
                  trialId: 0,
                  questionId: 0
              }
            }
          });
    },
    createNewModuleTrial: function(data){
        const results = ModuleResults.insert(data);
            Meteor.users.update(Meteor.userId(), {
                $set: {
                curModule: {
                    moduleId: results,
                    pageId: 0,
                    questionId: 0,
                 }
                }
            });
        return results;
    },
    saveModuleData: function (moduleData){
        ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
        Meteor.users.upsert(Meteor.userId(), {
            $set: {
            curModule: {
                moduleId: Meteor.user().curModule.moduleId,
                pageId: moduleData.nextPage,
                questionId: moduleData.nextQuestion,
            }
        }
    })
},
    getPrivateImage: function(fileName){
        result =  Assets.absoluteFilePath(fileName);
        return result;
    },
    generateApiToken: function(userId){
        var newToken = "";
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < 16; i++ ) {
            newToken += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        var future = new Date();
        future.setDate(future.getDate() + 30);
        Meteor.users.update(userId, {
            $set: {
              api: {
                  token: newToken,
                  expires: future
              }
            }
        });
    },
    calcOrgStats: function(){
        users = Meteor.users.find({organization: Meteor.user().organization}).fetch();
        subscales = [];
        subscaleList = [];
        data = {};
        data.userCount = users.length;
        data.assessmentCount = 0;
        data.moduleCount = 0;
        subscaleData = [];
        for(i = 0; i < users.length; i++){
            trials = Trials.find({"userId": users[i]._id}).fetch();
            for(j = 0; j < trials.length; j++){
                data.assessmentCount++;
                for(k = 0; k < Object.getOwnPropertyNames(trials[j].subscaleTotals).length; k++){
                    subscale = Object.getOwnPropertyNames(trials[j].subscaleTotals)[k];
                    subscaleIndex = subscaleList.indexOf(subscale);
                    if(subscaleIndex === -1){
                        subscaleList.push(subscale);
                        subscaleIndex = subscaleList.indexOf(subscale);
                        subscaleData[subscaleIndex] = {
                            name: subscale,
                            all: [trials[j].subscaleTotals[subscale]],
                            count: 1,
                            sum: trials[j].subscaleTotals[subscale],
                            avg:  trials[j].subscaleTotals[subscale],
                            median: trials[j].subscaleTotals[subscale],
                        };
                    } else {
                        subscaleData[subscaleIndex].all.push(trials[j].subscaleTotals[subscale]);
                        subscaleData[subscaleIndex].count++;
                        subscaleData[subscaleIndex].sum+= trials[j].subscaleTotals[subscale];
                        subscaleData[subscaleIndex].avg = subscaleData[subscaleIndex].sum / subscaleData[subscaleIndex].count;
                        const sorted = subscaleData[subscaleIndex].all.slice().sort((a, b) => a - b);
                        const middle = Math.floor(sorted.length / 2);
                        if (sorted.length % 2 === 0) {
                            median = (sorted[middle - 1] + sorted[middle]) / 2;
                        } else {
                            median = sorted[middle];
                        }
                        subscaleData[subscaleIndex].median = median;
                    }
           
                }
            }
        }
        data.subscaleData = subscaleData;
        Orgs.upsert({_id: Meteor.user().organization},{
            $set: {
                orgStats: data
            }
        })
    },
    createEvent: function(type, month, day, year, time, title){
        Events.insert({
            type: type,
            org: Meteor.user().organization,
            month: month,
            day: day,
            year: year,
            title: title,
            time: time,
            createdBy: this.userId
        })
    },
    deleteEvent: function(eventId){
        Events.remove({_id: eventId})
    },
});

//Server Methods
function addUserToRoles(uid, roles){
    Roles.addUsersToRoles(uid, roles);
    Meteor.users.update({ _id: uid }, { $set: { role: Roles.getRolesForUser(uid)[0] }});
}

function removeUserFromRoles(uid, roles){
    Roles.removeUsersFromRoles(uid, roles);
    Meteor.users.update({ _id: uid }, { $set: { role: Roles.getRolesForUser(uid)[0] }});
}

function serverConsole(...args) {
    const disp = [(new Date()).toString()];
    for (let i = 0; i < args.length; ++i) {
      disp.push(args[i]);
    }
    // eslint-disable-next-line no-invalid-this
    console.log.apply(this, disp);
}

function getInviteInfo(inviteCode) {
    supervisor = Meteor.users.findOne({supervisorInviteCode: inviteCode});
    targetSupervisorId = supervisor._id;
    organization = Orgs.findOne({_id: supervisor.organization});
    targetSupervisorName = supervisor.firstname + " " + supervisor.lastname;
    targetOrgId = supervisor.organization;
    targetOrgName = organization.orgName;
    console.log(targetOrgId,targetOrgName,targetSupervisorId,targetSupervisorName);
    return {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName};
}

//Publications and Mongo Access Control
Meteor.users.deny({
    update() { return true; }
});

Meteor.users.allow({

});

//Show current user data for current user
Meteor.publish(null, function() {
    return Meteor.users.find({_id: this.userId});
});

//Publish current assessment information
Meteor.publish('curAssessment', function(id) {
    return Assessments.find({_id: id});
});

//allow admins to see all users of org, Can only see emails of users. Can See full data of supervisors
Meteor.publish('getUsersInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin' )){ 
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user' });
    }
    else if(Roles.userIsInRole(this.userId, 'supervisor')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user', supervisor: this.userId})
    }
});

Meteor.publish('getSupervisorsInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'supervisor' });
    }
});

//Allow users access to Org information
Meteor.publish(null, function() {
    if(Meteor.user()){
        return Orgs.find({_id: Meteor.user().organization});
    }
});

//allow the use of Roles.userIsInRole() accorss client
Meteor.publish(null, function () {
    if (this.userId) {
        return Meteor.roleAssignment.find({ 'user._id': this.userId });
    } 
    else {
        this.ready()
    }
});
//allow assessments to be published
Meteor.publish('assessments', function () {
    return Assessments.find({});
});

//allow current users trial data to be published
Meteor.publish('usertrials', function () {
    if(Roles.userIsInRole(this.userId, ['admin', 'supervisor']))
        return Trials.find();
    return Trials.find({'userId': this.userId});
});

//allow current module pages to be published
Meteor.publish('curModule', function (id) {
    return Modules.find({_id: id});
});
//allow all modules to be seen
Meteor.publish('modules', function () {
    return Modules.find({});
});
//get module results
Meteor.publish('getUserModuleResults', function (id) {
    return ModuleResults.find({});
});

Meteor.publish('getModuleResultsByTrialId', function (id) {
    return ModuleResults.find({_id: id});
});

//get my events
Meteor.publish(null, function() {
    return Events.find({createdBy: this.userId});
});

//get all organization events
Meteor.publish('events', function() {
    console.log(Meteor.user().organization, this.userId)
    if(Meteor.user()){
        return Events.find({$or: [{ $and: [{org: Meteor.user().organization},{createdBy: this.userId}]},{$and:[{createdBy: Meteor.user().supervisor},{type:"Supervisor Group"}]},{$and: [{org: Meteor.user().organization},{type: "All Organization"}]}]}, {sort: {year:1 , month:1, day:1}})
    }
});