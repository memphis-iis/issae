Template.moduleReport.helpers({
    'generalinfo': function (){
        resultsData = ModuleResults.findOne();
        modData = Modules.findOne({_id: resultsData.moduleId})
        dateAccessed = new Date(0);
        data = { 
            lastAccessed: dateAccessed,
            title: modData.title,
            lastAccessed: resultsData.lastAccessed,

        }
        return data;
    },

    'pages': function(){
        resultsData = ModuleResults.findOne();
        modData = Modules.findOne({_id: resultsData.moduleId})
        console.log(resultsData, modData);
        responses = [];
        for(i = 0; i < resultsData.responses.length; i++){
            if(modData.pages[resultsData.responses[i].pageId].questions[resultsData.responses[i].questionId].type != "combo"){
                data = {
                    question: modData.pages[resultsData.responses[i].pageId].questions[resultsData.responses[i].questionId].prompt,
                    answer: resultsData.responses[i].response[0]
                }
                console.log(data);
                responses.push(data)
            } else {
                comboQuestions = modData.pages[resultsData.responses[i].pageId].questions[resultsData.responses[i].questionId].fields;
                for(j = 0; j < comboQuestions.length; j++){
                    data = {
                        question: comboQuestions[j].text,
                        answer: resultsData.responses[i].response[j]
                    }
                    console.log(data);
                    responses.push(data);
                }
            }
        }
        console.log(responses);
        return responses;
    },
})

Template.moduleReport.events({
    'click #controlpanel': function(event){
        event.preventDefault();
        target = "/control-panel/";
        window.location.href = target;
    },
})


Template.moduleReport.onCreated(function() {
    Meteor.subscribe('modules');
})
