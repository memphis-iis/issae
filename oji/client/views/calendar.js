Template.calendar.helpers({
    'calendar': function(){
        const t = Template.instance();
        displayMonthName =  t.displayMonthName.get();
        displayMonth = t.displayMonth.get();
        displayYear =  t.displayYear.get();
        displayDay =  t.displayDay.get();
        displayMonth = t.displayMonth.get();
        daysInMonth = t.daysInAMonth.get(),
        daysStartsOnA = new Date(displayMonth, displayYear, 1).getDay(),
        curDay = 1;
        weeks = [];
        monthStarted = false;
        for(i = 0; i < 6; i++){
            weekDays = []
            for(j = 0; j < 7; j++){
                today = false;
                hasEvents = false;
                events = Events.find({month: displayMonth, day: curDay, year: displayYear}).fetch();

                numEvents = events.length;
                if(curDay == new Date().getDate()){
                    today = true;
                }
                if(events.length != 0){
                    hasEvents = true;
                }
                if(!monthStarted && daysStartsOnA == j){
                    data = {
                        dayNum: curDay,
                        display: true,
                        today: today,
                        hasEvents: hasEvents,
                        numEvents: numEvents
                    }
                    monthStarted = true;
                    curDay++;
                } else {
                    if(monthStarted && curDay <= daysInMonth){
                        data = {
                            dayNum: curDay,
                            display: true,
                            today: today,
                            hasEvents: hasEvents,
                            numEvents: numEvents
                        }
                        curDay++;
                    } else {
                        data = {
                            dayNum: 0,
                            display: false
                        }
                    }
                }
                weekDays.push(data);
            }
            data = {
                days: weekDays
            }
            weeks.push(data);
        }
        calStarted = false;
        data = {
            Month: displayMonthName,
            NumMonth: displayMonth,
            Year: displayYear,
            DaysInMonth: daysInMonth,
            startsOn: daysStartsOnA,
            weeks: weeks
        };
        return data;
    },
    'agenda': function(){
        const t = Template.instance();
        displayMonthName =  t.displayMonthName.get();
        displayMonth = t.displayMonth.get();
        displayYear =  t.displayYear.get();
        displayDay =  t.displayDay.get();
        var day = displayDay;
        var month = displayMonth;
        var year = displayYear;
        events = Events.find({year: year, month: month, day: day}).fetch();
        events.forEach(element => {
            if(element.type == "All Organization" || element.onCreatedBy != Meteor.userId()){
                element.deleteShow = false;
            }

            if(element.type == "Supervisor Group" || element.onCreatedBy != Meteor.userId()){
                element.deleteShow = false;
            }
            if(element.type == "Personal"){
                element.deleteShow = true;
            }
        });
        var agenda = {
            monthName: displayMonthName,
            day: day,
            month: month + 1,
            year: year,
            events: events
        }
        return agenda;
    }
})

Template.calendar.events({
    'change #month-select': function(event){
        const t = Template.instance();
        t.selectedUser.set(event.target.value);
    },
    'click #createEvent': function(event){
        event.preventDefault();
        var inputDate = $('#date').val();
        console.log(inputDate);
        time =  $('#time').val();
        var date = inputDate.split("-");
        console.log(date);
        var day = parseInt(date[2]);
        var month = date[1] - 1;
        var year = parseInt(date[0]);
        console.log(day,month,year);
        type = $('#type').val();
        title = $('#title').val();
        $('#type').val("");
        $('#title').val("");
        $('#time').val("");
        $('#date').val("");
        Meteor.call('createEvent', type ,month, day, year, time, title);
    },
    'click #deleteEvent': function(event){
        event.preventDefault();
        eventId = $(event.target).data('id');
        Meteor.call('deleteEvent',eventId);
    },
    'click #toggle-month-view': function(event){
        event.preventDefault();
        $('#month-view').show();
        $('#agenda-view').hide();
        $('#create-view').hide();
    },
    'click .toggle-agenda-view': function(event){
        event.preventDefault();
        const t = Template.instance();
        const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
        if(event.target.getAttribute('data-day')){
            newDay = parseInt(event.target.getAttribute('data-day'));
            newMonth = parseInt(event.target.getAttribute('data-month'));
            newYear = parseInt(event.target.getAttribute('data-year'));
        } else {
            today = new Date;
            newDay = today.getDate();
            newMonth = today.getMonth();
            newYear = today.getFullYear();
        }
        t.displayMonthName.set(monthNames[newMonth]);
        t.displayMonth.set(newMonth);
        t.displayYear.set(newYear);
        t.displayDay.set(newDay);
        dateString = newYear + "-" + newMonth + "-" + newDay;
        $('#date').val(dateString); 
        $('#month-view').hide();
        $('#agenda-view').show();
        $('#create-view').hide();
    },
    'click .toggle-create-view': function(event){
        event.preventDefault();
        const t = Template.instance();
        const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
        if(event.target.getAttribute('data-day')){
            newDay = parseInt(event.target.getAttribute('data-day'));
            newMonth = parseInt(event.target.getAttribute('data-month'));
            newYear = parseInt(event.target.getAttribute('data-year'));
            t.displayMonthName.set(monthNames[newMonth]);
            t.displayMonth.set(newMonth);
            t.displayYear.set(newYear);
            t.displayDay.set(newDay);
            if(newDay < 10) newDay = "0" + newDay;
            if(newMonth < 10) newMonth = "0" + (newMonth + 1);
            dateString = newYear + "-" + newMonth + "-" + newDay;
            document.getElementById("date").value = dateString;
        }
        event.preventDefault();
        $('#month-view').hide();
        $('#agenda-view').hide();
        $('#create-view').show();
    },
    'click #decrement-month': function(){
        const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
        const t = Template.instance();
        newMonth = t.displayMonth.get() -1 ;
        newYear = t.displayYear.get();
        if(newMonth == -1){
            newMonth = 11;
            newYear = newYear - 1
            t.displayYear.set(newYear);
        }
        t.displayMonthName.set(monthNames[newMonth]);
        t.displayMonth.set(newMonth);
        newDaysInAMonth = new Date(newYear, newMonth, 0).getDate()
        t.daysInAMonth.set(newDaysInAMonth);
    },
    'click #increment-month': function(){
        const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
        const t = Template.instance();
        newMonth = t.displayMonth.get() + 1 ;
        newYear = t.displayYear.get();
        if(newMonth == 12){
            newMonth = 0;
            newYear = newYear - 1
            t.displayYear.set(newYear);
        }
        t.displayMonthName.set(monthNames[newMonth]);
        t.displayMonth.set(newMonth);
        newDaysInAMonth = new Date(newYear, newMonth, 0).getDate()
        t.daysInAMonth.set(newDaysInAMonth);
    }
})

Template.calendar.onCreated(function() {
    Meteor.subscribe('events');
    const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
    unixDate = new Date();
    curMonthName = monthNames[unixDate.getMonth()];
    curYear = unixDate.getFullYear();
    this.displayMonth = new ReactiveVar(unixDate.getMonth());
    this.displayMonthName = new ReactiveVar(curMonthName);
    daysInAMonth = new Date(unixDate.getMonth(), curYear, 0).getDate();
    this.displayYear = new ReactiveVar(curYear);
    this.displayDay = new ReactiveVar(unixDate.getDate());
    this.daysInAMonth = new ReactiveVar(daysInAMonth)

})

