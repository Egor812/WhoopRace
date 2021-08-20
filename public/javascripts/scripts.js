let clockElm;

/*
Страница приглашения пилотов
 */
function prerace(group=0) {

    let groups = settings.groups;
    //let prepareTimer = settings.prepareTimer;
    //let raceTimer = settings.raceTimer;
    let groupThis = group;
    let groupMax = groups.length; // max index+1
    let groupNext;

    console.log(groups);

    const elmPilots = [];
    const elmPilotsNext=[];
    const htmlGroup = document.getElementById('group');
    const elmPagination = $('#pagination');
    for( let i=0; i<4; i++) {
        elmPilots[i] = $('#pilot-'+(i+1)+' .name');

        elmPilotsNext[i] = $('#pilot-next-'+(i+1));
    }

    htmlGroup.innerHTML= `Группа ${(groupThis+1)}`;
    for( let i=0; i<groups[groupThis].length; i++){
        elmPilots[i].text(groups[groupThis][i]['Name']);
        $('#pilot-'+(i+1)+' > .ch').text(groups[groupThis][i]['Channel']);
        if( settings.judges) $('#pilot-'+(i+1)+' > .judge').text(groups[groupThis][i]['Судьи']);
    }
    groupNext = groupThis+1;
    if( groupNext>=groupMax) groupNext=0;
    for( let i=0; i<groups[groupNext].length; i++){
        elmPilotsNext[i].text(groups[groupNext][i]['Name']);
        elmPilotsNext[i].text(groups[groupNext][i]['Name']);
    }

    //clockElm = document.getElementById('prepare-timer');
    //clockElm.innerText = settings.prepareTimer;

    $('#race-timer').hide();
    clockElm = $('#prepare-timer');
    if( settings.prepareTimer===0 ) clockElm.text('');
    else clockElm.text(settings.prepareTimer);
    clockElm.show();

    let pagination='<ul class="pagination">';
    let sel;
    pagination +=
        '<li data-page="'+String(groupThis-1)+'" class="page-item">'+
            '<span class="page-link pagination-dark"><span aria-hidden="true">&laquo;</span></span>'+
        '</li>';
    for( let i=0; i<groups.length; i++) {
        if( i===groupThis) sel='active';
        else sel ='';
        pagination += '<li data-page="'+i+'" class="page-item '+sel+'"><span class="page-link pagination-dark">' + (i+1) + '</span></li>';
    }
    pagination +=
        '<li data-page="'+groupNext+'" class="page-item">'+
        '<span class="page-link pagination-dark"><span aria-hidden="true">&raquo;</span></span>'+
        '</li>';

    pagination += '</ul>';
    elmPagination.html(pagination);

}

function race() {
    $('#prepare-timer').hide();
    clockElm = $('#race-timer');
    clockElm.text(settings.raceTimer);
    clockElm.show();
    if( settings.withoutTVP ) document.getElementById('wav-counter').play();
}

function showPilotsAll(pilotsG) {
    if( pilotsG === undefined ) return;
    const HTMLOUT = document.getElementById('list-pilots');
    let x='';
    let num=0;
    for (let group = 0; group < pilotsG.length; group++) {
        x += '<p> Группа ' + (group+1) + ':';
        for (let ii = 0; ii < pilotsG[group].length; ii++) {
            x += '<span class="setup-pilots-badge badge badge-warning">' + pilotsG[group][ii]['Name'] + '</span>';
            num++;
        }
        x += '</p>';
    }

    x += '</p>';
    x = 'Загружено пилотов : ' + num +'<p>' + x;
    HTMLOUT.innerHTML = x;
}

/*
Заполнение формы setup
 */
function setSettings(settings) {
    if( settings['judges'] ) $('#checkbox-judge').prop('checked', true);
    if( settings['withoutTVP'] ) $('#checkbox-without-tvp').prop('checked', true);
    if( settings['obsUse'] ) $('#checkbox-obsUse').prop('checked', true);

    $('#obsPort').val(settings.obsPort);
    $('#obsPassword').val(settings.obsPassword);
    $('#obsSceneTVP').val(settings.obsSceneTVP);
    $('#obsSceneWR').val(settings.obsSceneWR);
    $('#obsSceneBreak').val(settings.obsSceneBreak);


    $('#inputPrepareTime').val(settings.prepareTimer);
    $('#inputRaceTime').val(settings.raceTimer);
    $('#inputRaceLaps').val(settings.raceLaps);
    $('#inputLoops').val(settings.raceLoops);
    showPilotsAll(settings.groups);
}

/*
Получить данные формы настроек
 */
function getSettingsFromForm(){
    let judges, withoutTVP, multiGp, obsUse;
    if( $('#checkbox-judge').is(':checked') ) judges=1; else judges=0;
    if( $('#checkbox-multigp').is(':checked') ) multiGp=1; else multiGp=0;
    if( $('#checkbox-obsUse').is(':checked') ) obsUse=1; else obsUse=0;
    if( $('#checkbox-without-tvp').is(':checked') ) withoutTVP=1; else withoutTVP=0;
    let prepareTimer = Number($('#inputPrepareTime').val());
    let raceTimer = Number($('#inputRaceTime').val());
    let raceLaps = Number($('#inputRaceLaps').val());
    let raceLoops = Number($('#inputLoops').val());
    let obsPort = Number($('#obsPort').val());
    let obsPassword = $('#obsPassword').val();
    let obsSceneTVP = $('#obsSceneTVP').val();
    let obsSceneWR = $('#obsSceneWR').val();
    let obsSceneBreak = $('#obsSceneBreak').val();
    const args = {judges: judges, withoutTVP: withoutTVP, prepareTimer: prepareTimer, raceTimer : raceTimer, raceLoops: raceLoops, multiGp: multiGp,
        obsUse:obsUse, obsPort:obsPort, obsSceneTVP:obsSceneTVP, obsSceneWR:obsSceneWR, obsSceneBreak:obsSceneBreak, obsPassword:obsPassword, raceLaps:raceLaps};
    console.log(args);
    return args;
}

// IPC

const { ipcRenderer } = require('electron');
const remote = require('electron').remote;

const settings = remote.getGlobal( "settings" );

ipcRenderer.on('timer-value', (event, arg)=> {
    clockElm.text(arg);
});

ipcRenderer.on('finish', (event, arg)=> {
    if( settings.withoutTVP ) document.getElementById('wav-finish').play();
});

ipcRenderer.on('show-race', (event, arg)=> {
    race();
});

ipcRenderer.on('show-prerace', (event, arg)=> {
    prerace(arg['group']);
});

ipcRenderer.on('open-dialog-paths-selected', (event, arg)=> {
    setup.handler.outputSelectedPathsFromOpenDialog(arg);
    // запрос с промисом
    ipcRenderer.invoke('parse-xls', arg).then( result => {
        showPilotsAll(result);
    });
});


// HANDLERS

window.setup = window.setup || {},
    function(n) {

        setup.handler = {

            showOpenDialog: function() {
                ipcRenderer.send('show-open-dialog');
            },
            getXLSTemplate: function() {
                ipcRenderer.send('get-xls-tpl');
            },

            outputSelectedPathsFromOpenDialog: function(paths) {
                console.log('user selected: ' + paths);
                //readXLSX(paths);
            },

            obsCreatScenes: function()
            {
                ipcRenderer.invoke('obsCreateScenes', {port: Number($('#obsPort').val()), pass:$('#obsPassword').val(), TVP: $('#obsSceneTVP').val(), WR: $('#obsSceneWR').val(), Break: $('#obsSceneBreak').val()})
            },

            obsCheckConnection: function()
            {
                ipcRenderer.invoke('obsCheckConnection', { port: Number($('#obsPort').val()), pass:$('#obsPassword').val() } )
                    .then( result => { if ( result===1 ) alert('OK'); else alert('Error');});
            },

            saveSettings: function(){
              const args = getSettingsFromForm();
                ipcRenderer.invoke('save-settings', args).then( result => {
                    alert('Сохранено')
                });

            },

            submitRace: function(){
                const args = getSettingsFromForm();
                //ipcRenderer.sendSync('submit-race',args);

                ipcRenderer.invoke('submit-race', args).then( result => {
                    if( result ) {
                        $('#menu').hide();
                        ipcRenderer.send('start-prerace', {group: 0});
                        $('#race').show();
                    }
                    else alert('Загрузите пилотов')
                });

            },

            stopRace: function(){
                $('#race').hide();
                ipcRenderer.invoke('stop-race').then( result => {
                    setSettings(settings);
                    $('#menu').show();
                });
            },

            changePage: function(elm){
                //alert(elm.dataset.page);
                ipcRenderer.send('start-prerace',{ group : Number(elm.dataset.page) });
                $('#race').show();
            },


            //EVENTS
            init: function() {
                $('#showOpendialog').click( function () {
                    setup.handler.showOpenDialog();
                });
                $('#getXLSTemplate').click( function () {
                    setup.handler.getXLSTemplate();
                });
                $('#obsCreatScenes').click( function () {
                    setup.handler.obsCreatScenes();
                    }
                );
                $('#obsCheckConnection').click( function () {
                        setup.handler.obsCheckConnection();
                    }
                );
                $('#save-settings').click( function () {
                    setup.handler.saveSettings();
                });

                $('#submit-race').click( function () {
                    setup.handler.submitRace();
                });
                $('#stop-race').click( function () {
                    setup.handler.stopRace();
                });
                $('#pagination').on('click', '.page-item', function () {
                    setup.handler.changePage(this);
                });

                $(function() {  // on ready
                    setSettings(settings);
                });

            }
        };



        n(function() {
            setup.handler.init();
        })
    }(jQuery); // Immediately Invoked Function Expression.