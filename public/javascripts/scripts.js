const clockPrepareElm = $('#prepare-timer');
const clockRaceElm = $('#race-timer');
let clockElm = clockRaceElm;
const elmPagination = $('#pagination');
const elmRace = $('#race');
const elmMenu = $('#menu');
const elmResults = $('#results');
const elmRerace = $('#rerace');
const elmStartNow = $('#start-now');
let contextMenu; // открыто любое контекстное меню
//let invalidResults = 0;

function showMenu(settings, inCompetition, raceLoop, groupCur, rulesName) {
    setSettings(settings);
    //showPilotsAll(settings.groups);
    rulesChangeRender();
    if( inCompetition){
        $('#terminate-race').show();
        $('#rulesSelector').attr('disabled', true);
        $('#submit-race').hide();
        $('#showOpendialog').attr('disabled', true);
    }
    else{
        $('#terminate-race').hide();
        $('#rulesSelector').attr('disabled', false);
        $('#submit-race').show();
        $('#showOpendialog').attr('disabled', false);
    }
    //if( raceLoop<settings.raceLoops) {
    if( inCompetition && raceLoop<settings.raceLoops) {
        document.getElementById('race-progress').innerHTML = `${rulesName} Продолжить с раунда ${raceLoop+1} и группы ${groupCur+1}`;
        $('#resume-race').show();
    }
    else {
        document.getElementById('race-progress').innerHTML = `Гонка завершена`;
        $('#resume-race').hide();
    }
    elmMenu.show();
}

/*
Страница приглашения пилотов
 */
function prerace(data) {

    elmRace.show();
    elmMenu.hide();
    elmResults.hide();
    elmRerace.hide();
    elmStartNow.show();

    console.log( data );
    //let groups = settings.groups;
    ////let prepareTimer = settings.prepareTimer;
    ////let raceTimer = settings.raceTimer;
    //const raceLoops = settings.raceLoops;
    //let groupThis = group;
    //let groupMax = groups.length; // max index+1
    //let groupNext;

    const elmPilots = [];
    const elmPilotsNext = [];
    const htmlGroup = document.getElementById('group');
    const htmlRound = document.getElementById('round');
    const htmlRoundName = document.getElementById('round-name');

    $('.group-pilots-results').hide();

    htmlGroup.innerHTML= `Группа ${(data.groupCur+1)}`;
    if( !data.showGroup ) htmlGroup.style.display='none';
    else htmlGroup.style.display='inline-block';

    htmlRound.innerHTML= `Раунд ${(data.loop+1)}/${data.maxLoops}`;
    if( data.raceName !=='') {
        htmlRoundName.innerHTML = data.raceName;
        htmlRoundName.style.display='inline-block';
    }
    else {
        htmlRoundName.style.display='none';
    }

    for( let i=0; i<4; i++ ){
        elmPilots[i] = $('#pilot-'+(i+1)+' .name');
        if( i<data.group.length ) {
            $('#pilot-'+(i+1)).show();
            elmPilots[i].text( data.group[i].name );
            $('#pilot-' + (i + 1) + ' > .ch').text( data.group[i].channel );
            $('#pilot-' + (i + 1) + ' > .stat').text( data.group[i].resultTxt[0] );
            $('#pilot-' + (i + 1) + ' > .place').text( data.group[i].resultTxt[1] );
            //if (settings.judges) $('#pilot-' + (i + 1) + ' > .judge').text(groups[groupThis][i]['Judges']);
        }
        else $('#pilot-'+(i+1)).hide();
    }

    if( data.groupNext !== undefined ) {
        for( let i=0; i<4; i++ ){
            elmPilotsNext[i] = $('#pilot-next-'+(i+1));
            if( i<data.groupNext.length ) {
                elmPilotsNext[i].show();
                elmPilotsNext[i].text( data.groupNext[i].name );
            }
            else elmPilotsNext[i].hide();
        }
        $('#group-next').show();
    }
    else{
        $('#group-next').hide();
    }

    //clockElm = document.getElementById('prepare-timer');
    //clockElm.innerText = settings.prepareTimer;

    switchToPreraceTimer();

    let pagination='';
    if( data.showNext) {
        elmPagination.show();
        let sel;
        pagination += '<button data-page="' + String(data.groupCur - 1) + '" type="button" class="btn btn-outline-primary pagination-group">&laquo;</button>';
        for (let i = 0; i < data.groupsQty; i++) {
            if (i === data.groupCur) sel = 'btn-primary'; else sel = 'btn-outline-primary';
            pagination += '<button data-page="' + i + '" type="button" class="btn ' + sel + ' pagination-group">' + (i + 1) + '</button>';
        }
        if (data.groupNext !== undefined) {
            pagination += '<button data-page="' + data.groupNext + '" type="button" class="btn btn-outline-primary pagination-group">&raquo;</button>';
        }
        pagination += '</div>';
    }
    else{
        elmPagination.hide();
    }
    elmPagination.html(pagination);

    $("#rerace").data('group', data.groupCur );

    if( data.wawGroup ){
        let audio = document.getElementById('wav-invite');
        audio.addEventListener('ended', () => {
            setTimeout(() => {  document.getElementById('wav-' + (data.groupCur + 1)).play(); }, 250);
        }, { once: true });
        audio.play();
    }
    else{
        let audio = document.getElementById('wav-invitenext');
        audio.play();
    }

}

function switchToRaceTimer(raceTimer)
{
    clockPrepareElm.hide();
    clockElm = clockRaceElm;
    clockElm.text(raceTimer);
    clockElm.show();
}

function switchToPreraceTimer()
{
    clockRaceElm.hide();
    clockElm = clockPrepareElm;
    clockElm.html("&nbsp;"); // так сохраняется место под будущий таймер и нет проблемы с начальными значениями не из  settings.prepareTimer
    //if( settings.prepareTimer===0 ) clockElm.text('');
    //else clockElm.text(settings.prepareTimer);
    clockElm.show();
}

function switchToResultsTimer() {
    clockElm = $('#resultsTimer');
}

function race(rules, win32, raceTimer, withoutTVP)
{
    elmStartNow.hide();
    switchToRaceTimer(raceTimer);
    if( withoutTVP ) {
        for( let i=0; i<4; i++) {
            $('#gpp-' + (i+1)).val(0);
            $('#gpl-' + (i+1)).val(0);
            $('#gpt-' + (i+1)).val(0);
            if (!rules.savePlace) $('#gpp-' + (i + 1)).hide(); else {
                $('#gpp-' + (i + 1)).css("color", "red");
                $('#gpp-' + (i + 1)).show();
            }
            if (!rules.saveLaps) $('#gpl-' + (i + 1)).hide(); else $('#gpl-' + (i + 1)).show();
            if (!rules.saveTime) $('#gpt-' + (i + 1)).hide(); else $('#gpt-' + (i + 1)).show();
        }
        $('.group-pilots-results').css( "display", "block" );
        // Эта собака грохает приложение под виндой.
        // Тесты выявили, что так делает любой wav больше 202796 байт
        if( !win32) document.getElementById('wav-counter').play();
    }
}

/*
Результаты после вылета
data[][ pilot, pos, lps, total ]
 */
function results(data, rules)
{
    switchToPreraceTimer();
    //console.log( 'rules:'+rules);
    //console.log( data );
    for( let i=0; i<4; i++){
        if (!rules.savePlace) $('#gpp-' + (i + 1)).hide(); else $('#gpp-' + (i + 1)).show();
        if (!rules.saveLaps) $('#gpl-' + (i + 1)).hide(); else $('#gpl-' + (i + 1)).show();
        if (!rules.saveTime) $('#gpt-' + (i + 1)).hide(); else $('#gpt-' + (i + 1)).show();
        if( data !== null ) {
            if( typeof data[i] !== 'undefined' ) {
                $('#gpp-' + (i+1)).val(data[i].pos);
                $('#gpl-' + (i+1)).val(data[i].lps);
                $('#gpt-' + (i+1)).val(Number((data[i].total).toFixed(2)));
            }
        }
    }
    $('.group-pilots-results').css( "display", "block" );
    elmRerace.show();
    elmPagination.hide();
    //console.log(data);
}

// data[][ Results[laps pos time], Sums[pos ] ]
function showResults(data, loop, raceLoops) {
    console.log(data);
    elmRace.hide();
    elmMenu.hide();
    elmResults.show();
    let width=0; // for screenshot

    if( data === false) {
        document.getElementById('result-round').innerHTML= 'Гонка завершена';
        return;
    }

    if( loop === raceLoops)
        document.getElementById('result-round').innerHTML= `Раунд ${(loop)}/${raceLoops} Гонка завершена`;
    else
        document.getElementById('result-round').innerHTML= `Раунд ${(loop)}/${raceLoops}`;

    const HTMLOUT = document.getElementById('result-table');
    let x='';
    data.forEach( function(pilot) {
        x += '<span class="results-pilots-badge badge badge-warning" style="width:120px; margin-right:30px">' + pilot.Name + '</span>';
        let len = pilot.Results.length;
        if( len>width ) width = len;
        for(let i = 0; i < len; i++){
            x += '<span class="result-table-intermediate">';
            if( pilot.Results[i] !== undefined) {
                let a = '';
                if (pilot.Results[i].laps !== false) a += '<span class="result-cell" style="width: 20px;">' + pilot.Results[i].laps + '</span>';
                if (pilot.Results[i].pos !== false) a += '<span class="result-cell" style="width: 20px;">' + pilot.Results[i].pos + '</span>';
                if (pilot.Results[i].time !== false) a += '<span class="result-cell" style="width: 60px; color:gray;">' + pilot.Results[i].time + '</span>';
                if( a !== '' ) x += a;
                else x += '&nbsp;';
            }
            else{
                x += '&nbsp;';
            }
            x += '</span>';
        }
        if( typeof pilot.Sums !== 'undefined' ) {
            let style ='';
            if( pilot.Sums.pos>0 ) {
                if (pilot.Sums.pos <= 3) style = 'style="color:red"';
                x += `<span class="result-table-final" ${style}>` + pilot.Sums.pos;
                if( pilot.Sums.laps !==0 ) x += ' <span style="font-size: smaller; color:gray;">('+pilot.Sums.laps+'к)</span>';
                x += '</span>';
            }
            else{
                x += '<span class="result-table-final">&nbsp;</span>';
            }
        }
        x +='<br>';
    });
    x += '<span id="resultsTimer" style="text-align: right; width: 100%; display: inline-block; margin-top: 10px">...</span>';
    HTMLOUT.innerHTML = x;

    width = 155 + width*120 + 20;
    $( "#results-screenshot" ).data( "width", width );
}

// Вывести группы пилотов в меню
function showPilotsAll(pilotsG, channels) {
    console.log( pilotsG );
    if( pilotsG === undefined || pilotsG === false ) return;
    const HTMLOUT = document.getElementById('list-pilots');
    let x='';
    let num=0;
    for (let group = 0; group < pilotsG.length; group++) {
        x += '<p> Группа ' + (group+1) + ':';
        for (let ii = 0; ii < pilotsG[group].length; ii++) {
            x += '<span style="display: inline-block;"><span class="setup-pilots-badge badge badge-warning" data-id="' + pilotsG[group][ii]['Num'] + '">' + pilotsG[group][ii]['Name'] + ' <sup>'+ channels[ii] +'</sup></span></span>';
            num++;
        }
        x += '</p>';
    }

    x += '</p>';
    x = 'Загружено пилотов : ' + num +'<p>' + x;
    HTMLOUT.innerHTML = x;
}

function getFormRulesVal() {
    return Number($("#rulesSelector option:selected").val());
}

function getFormThemeVal() {
    return $("#themeSelector option:selected").data("theme");
}


function rulesChangeRender()
{
    $( ".rulesInfo" ).each(function() {
        $( this ).hide();
    });
    const elm = $( "#rulesSelector option:selected" );
    let n = elm.val();
    if( elm.data('loops')===0 ) $('#inputLoops').parent().parent().hide(); else $('#inputLoops').parent().parent().show();
    if( elm.data('laps')===0 ) $('#inputRaceLaps').parent().parent().hide(); else $('#inputRaceLaps').parent().parent().show();
    $( "#rulesInfo-"+n ).show();
}

/*
Заполнение формы setup
 */
function setSettings(settings) {
    //if( settings['judges'] ) $('#checkbox-judge').prop('checked', true);
    if( settings['withoutTVP'] ) $('#checkbox-without-tvp').prop('checked', true);
    if( settings['obsUse'] ) $('#checkbox-obsUse').prop('checked', true);
    if( settings['rules_num'] ) $('#rulesSelector option[value='+settings['rules_num']+']').attr('selected','selected');
    $('#obsPort').val(settings.obsPort);
    $('#obsPassword').val(settings.obsPassword);
    $('#obsSceneTVP').val(settings.obsSceneTVP);
    $('#obsSceneWR').val(settings.obsSceneWR);
    $('#obsSceneBreak').val(settings.obsSceneBreak);
    $('#inputPrepareTime').val(settings.prepareTimer);
    $('#inputRaceTime').val(settings.raceTimer);
    $('#inputRaceLaps').val(settings.raceLaps);
    $('#inputLoops').val(settings.raceLoops);
    $('#inputCh1').val(settings.channels[0]);
    $('#inputCh2').val(settings.channels[1]);
    $('#inputCh3').val(settings.channels[2]);
    $('#inputCh4').val(settings.channels[3]);

}

/*
Получить данные формы настроек
 */
function getSettingsFromForm(){
    let judges=0, withoutTVP, obsUse;
    //if( $('#checkbox-judge').is(':checked') ) judges=1; else judges=0;
    if( $('#checkbox-obsUse').is(':checked') ) obsUse=1; else obsUse=0;
    if( $('#checkbox-without-tvp').is(':checked') ) withoutTVP=1; else withoutTVP=0;
    const rules = Number($("#rulesSelector option:selected").val());
    let prepareTimer = Number($('#inputPrepareTime').val());
    let raceTimer = Number($('#inputRaceTime').val());
    let raceLaps = Number($('#inputRaceLaps').val());
    let raceLoops = Number($('#inputLoops').val());
    let obsPort = Number($('#obsPort').val());
    let obsPassword = $('#obsPassword').val();
    let obsSceneTVP = $('#obsSceneTVP').val();
    let obsSceneWR = $('#obsSceneWR').val();
    let obsSceneBreak = $('#obsSceneBreak').val();
    let channels = [ $('#inputCh1').val(), $('#inputCh2').val(), $('#inputCh3').val(), $('#inputCh4').val() ];
    return {judges: judges, withoutTVP: withoutTVP, prepareTimer: prepareTimer, raceTimer : raceTimer, raceLoops: raceLoops, rules_num: rules,
        obsUse:obsUse, obsPort:obsPort, obsSceneTVP:obsSceneTVP, obsSceneWR:obsSceneWR, obsSceneBreak:obsSceneBreak, obsPassword:obsPassword,
        raceLaps:raceLaps, channels: channels};
}

function getRulesFromForm() {
    return Number($("#rulesSelector option:selected").val());
}

/*
return Array [0..3][laps, pos, time]
 */
function getResultsFromForm() {
    let results=[];
    for( let i=1; i<=4; i++){
        results[i-1] = {
            laps : Number( $('#gpl-'+i).val()),
            pos : Number( $('#gpp-'+i).val() ),
            time : Number( $('#gpt-'+i).val() )
        };
    }
    return results;
}


// IPC

const { ipcRenderer } = require('electron');
//const settings = require('electron').remote.getGlobal( "settings" );
//const { BrowserWindow } = require('@electron/remote');
//const settings = require('@electron/remote').getGlobal( "settings" );

ipcRenderer.on('timer-value', (event, arg)=> {
    clockElm.text(arg);
});

ipcRenderer.on('20togo', ()=> {
    document.getElementById('wav-20secondstogo').play();
});

ipcRenderer.on('finish', (event,arg)=> {
    if( arg.withoutTVP ) document.getElementById('wav-finish').play();
});

ipcRenderer.on('editresults', (event, arg)=> {
    results(arg['stat'], arg['rules']);
});


ipcRenderer.on('show-race', (event, arg)=> {
    race( arg['rules'], arg['win32'], arg['raceTimer'], arg['withoutTVP'] );
});

ipcRenderer.on('show-prerace', (event, arg)=> {
    prerace(arg['data']);
});

ipcRenderer.on('open-dialog-paths-selected', (event, arg)=> {
    // сохраняем выбранные правила, так как они нужны для парсинга
    let rules = getRulesFromForm();
    ipcRenderer.send('save-rules', rules);

    //setup.handler.outputSelectedPathsFromOpenDialog(arg); //?
    // запрос с промисом
    ipcRenderer.invoke('parse-xls', arg).then( result => {
        showPilotsAll(result.groups, result.channels);
        $('menu-this-race').hide();
        /*ipcRenderer.invoke('get-progress').then( result  => {
            showMenu( settings, result.raceLoop, result.groupCur, result.rulesName);
        });*/

    });
});

ipcRenderer.on('query-results', ()=> {
    ipcRenderer.send('get-results',{ results : getResultsFromForm() });
});

ipcRenderer.on('show-results', (event, arg)=> {
    showResults( arg['results'], arg['round'], arg['raceLoops'] );
    switchToResultsTimer();
});


// HANDLERS

window.setup = window.setup || {}, // откуда я это взял? как это работает?
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
                ipcRenderer.invoke('obsCreateScenes', {
                    port: Number($('#obsPort').val()),
                    pass: $('#obsPassword').val(),
                    TVP: $('#obsSceneTVP').val(),
                     WR: $('#obsSceneWR').val(),
                    Break: $('#obsSceneBreak').val()
                }).then()
            },

            obsCheckConnection: function()
            {
                ipcRenderer.invoke('obsCheckConnection', { port: Number($('#obsPort').val()), pass:$('#obsPassword').val() } )
                    .then();
            },

            saveSettings: function(){
              const args = getSettingsFromForm();
                ipcRenderer.invoke('save-settings', args).then();
            },

            // Новая гонка
            submitRace: function(){
                const args = getSettingsFromForm();
                //ipcRenderer.sendSync('submit-race',args);
                ipcRenderer.invoke('submit-race', args).then( result => {
                    if( result===1 ) {
                        ipcRenderer.send('start-prerace', {group: 0} );
                    }
                });
            },

            // выйти из гонки в меню (Х)
            exitRace: function(){
                elmRace.hide();
                elmResults.hide();
                ipcRenderer.invoke('suspend-race').then( () => {
                    ipcRenderer.invoke('get-progress').then( result  => {
                        $('menu-this-race').show();
                        showMenu( result.settings, result.inCompetition, result.raceLoop, result.groupCur, result.rulesName);
                    });
                });
            },

            // показать результаты
            showStat: function(){
                ipcRenderer.send('get-stat');
            },

            // продолжить гонку
            resumeRace: function(){
                ipcRenderer.invoke('resume-race').then( result => {
                    if( result===1 ) {
                        ipcRenderer.send('start-prerace', {group: false});
                    }
                });
            },

            // завершить гонку
            terminateRace: function(){
                ipcRenderer.send('terminate-race');
                ipcRenderer.invoke('get-progress').then( result  => {
                    showMenu(result.settings, result.inCompetition, result.raceLoop, result.groupCur, result.rulesName);
                });
            },

            changePage: function(elm){
                ipcRenderer.send('start-prerace',{ group : Number(elm.dataset.page) });
                elmRace.show();
            },

            rerace: function(){
                let group = Number( elmRerace.data('group') );
                ipcRenderer.send('start-prerace',{ group : group });
                elmRace.show();
            },

            startNow: function(){
                ipcRenderer.send('start-race');
            },

            // увеличить время на подготовку
            addPreRaceTime: function() {
                ipcRenderer.send('add-prerace-time');
            },

            // пауза
            pausePreRace: function() {
                ipcRenderer.send('switch-pause-prerace');
            },

            pauseResults: function() {
                ipcRenderer.send('switch-pause-results');
            },

            takeScreenshot: function() {
                let elmResults = $('#results');
                ipcRenderer.send('screenshot-results', {x:100, y:50, width : $('#results-screenshot').data('width'), height: elmResults.height() });
            },

            // экспорт результатов в XLS
            exportXLS: function() {
                ipcRenderer.send('export-xls');
            },

            // проверка ввода мест на экране результатов вылета
            validateResults: function(elm) {
                let val = $(elm).val();
                let id = elm.id;
                //invalidResults = 0;
                $(".group-pilots-place").each(function () {
                    if ($(this).val() === val && $(this).attr('id') !== id) {
                        $(this).css("color", "red");
                        //invalidResults = 1;
                    } else {
                        $(this).css("color", "black");
                    }
                });
            },

            pilotMenu: function( elm ) {
                let id = $(elm).data('id');
                if( contextMenu !== undefined) {
                    $('.context-menu').remove();
                    if( contextMenu.id === id ) {
                        contextMenu = undefined;
                        return;
                    }
                    contextMenu = undefined;
                }
                //get menu from main
                ipcRenderer.invoke('get-pilot-context-menu', {id:id}).then( result  => {
                    contextMenu = {type:'pilot', id: id};
                    //todo сделать
                    console.log('CM');
                    //let html = showPilotContextMenu( result );
                    let html = 'aaa';
                    $(elm).after('<span class="pilot-menu list-group context-menu" style="position:absolute;z-index:10;">' +
                        html +
                        '   <a href="#" class="list-group-item list-group-item-action context-menu-item">A second link item</a>'+
                        '</span>');
                });
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
                });
                $('#obsCheckConnection').click( function () {
                    setup.handler.obsCheckConnection();
                });
                $('#save-settings').click( function () {
                    setup.handler.saveSettings();
                });
                $('#submit-race').click( function () {
                    setup.handler.submitRace();
                });
                $('#stop-race').click( function () {
                    setup.handler.exitRace();
                });
                $('#race-stat').click( function () {
                    setup.handler.showStat();
                });
                $('#close-stat').click( function () {
                    setup.handler.exitRace();
                });
                $('#resume-race').click( function () {
                    setup.handler.resumeRace();
                });
                $('#terminate-race').click( function () {
                    setup.handler.terminateRace();
                });

                $('#export-xls').click( function () {
                    setup.handler.exportXLS();
                });
                elmPagination.on('click', '.pagination-group', function () {
                    setup.handler.changePage(this);
                });
                elmRerace.click( function () {
                    setup.handler.rerace();
                });
                elmStartNow.click( function () {
                    setup.handler.startNow();
                });
                $('#list-pilots').on('click', '.setup-pilots-badge', function () {
                    setup.handler.pilotMenu(this);
                });

                addEventListener("keyup", function(event) {
                    if (event.code === 'KeyQ') {
                        if (clockPrepareElm.is(":visible")) {
                            setup.handler.addPreRaceTime();
                        }
                    }
                    else if (event.code === 'Space') {
                        if (clockPrepareElm.is(":visible")) {
                            setup.handler.pausePreRace();
                        }
                        else{
                            if( $('#resultsTimer').is(':visible')){
                                setup.handler.pauseResults();
                            }
                        }
                    }
                });

                $('#results-screenshot').click( function () {
                    setup.handler.takeScreenshot();
                });

                // основное меню - смена правил
                $( "#rulesSelector" ).change( function() {
                    ipcRenderer.invoke('repackGroups', getFormRulesVal() ).then( (result) => {
                        console.log(result);
                        if( result!==false) showPilotsAll(result.groups, result.channels);
                    });
                    rulesChangeRender();
                });
                //.trigger( "change" );
                $('.group-pilots-place').change( function () {
                    setup.handler.validateResults(this);
                    console.log('group-pilots-place change');
                });

                $( "#themeSelector" ).change( function() {
                    $("head link#theme").attr('href','./stylesheets/'+getFormThemeVal());
                });

                $(function() {  // on ready
                    ipcRenderer.invoke('get-progress').then( result  => {
                        showPilotsAll(result.groups, result.settings.channels);
                        showMenu( result.settings, result.inCompetition, result.raceLoop, result.groupCur, result.rulesName);
                    });
                });

            }

        };



        n(function() {
            setup.handler.init();
        })
    }(jQuery); // Immediately Invoked Function Expression.