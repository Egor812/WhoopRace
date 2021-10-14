let clockElm;

function showMenu(settings, raceLoop, groupCur, rulesName) {
    setSettings(settings);
    showPilotsAll(settings.groups);
    rulesChangeRender();
    if( raceLoop<settings.raceLoops) {
        document.getElementById('race-progress').innerHTML = `${rulesName} Продолжить с раунда ${raceLoop+1} и группы ${groupCur+1}`;
        $('#resume-race').show();
    }
    else {
        document.getElementById('race-progress').innerHTML = `Гонка завершена`;
        $('#resume-race').hide();
    }
    $('#menu').show();
}

/*
Страница приглашения пилотов
 */
function prerace(group=0, round = 0, showNext= 1) {

    $('#race').show();
    $('#menu').hide();
    $('#results').hide();
    $('#rerace').hide();
    $('#pagination').show();

    let groups = settings.groups;
    //let prepareTimer = settings.prepareTimer;
    //let raceTimer = settings.raceTimer;
    const raceLoops = settings.raceLoops;
    let groupThis = group;
    let groupMax = groups.length; // max index+1
    let groupNext;

    console.log(groups);

    const elmPilots = [];
    const elmPilotsNext=[];
    const htmlGroup = document.getElementById('group');
    const htmlRound = document.getElementById('round');
    const elmPagination = $('#pagination');

    $('.group-pilots-results').hide();

    htmlGroup.innerHTML= `Группа ${(groupThis+1)}`;
    htmlRound.innerHTML= `Раунд ${(round+1)}/${raceLoops}`;
    for( let i=0; i<4; i++ ){
        elmPilots[i] = $('#pilot-'+(i+1)+' .name');
        if( i<groups[groupThis].length ) {
            $('#pilot-'+(i+1)).show();
            elmPilots[i].text(groups[groupThis][i]['Name']);
            $('#pilot-' + (i + 1) + ' > .ch').text(groups[groupThis][i]['Channel']);
            if (settings.judges) $('#pilot-' + (i + 1) + ' > .judge').text(groups[groupThis][i]['Judges']);
        }
        else $('#pilot-'+(i+1)).hide();
    }

    groupNext = groupThis + 1;
    if (groupNext >= groupMax) groupNext = 0;
    if( showNext ) {
        for (let i = 0; i < groups[groupNext].length; i++) {
            elmPilotsNext[i] = $('#pilot-next-'+(i+1));
            elmPilotsNext[i].text(groups[groupNext][i]['Name']);
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
    let sel;
    pagination += '<button data-page="'+String(groupThis-1)+'" type="button" class="btn btn-outline-primary pagination-group">&laquo;</button>';
    for( let i=0; i<groups.length; i++) {
        if( i===groupThis) sel='btn-primary'; else sel='btn-outline-primary';
        pagination += '<button data-page="'+i+'" type="button" class="btn '+sel+' pagination-group">'+ (i+1) +'</button>';
    }
    pagination += '<button data-page="'+groupNext+'" type="button" class="btn btn-outline-primary pagination-group">&raquo;</button>';
    pagination += '</div>';
    elmPagination.html(pagination);

    $("#rerace").data('group', groupThis );

    let audio = document.getElementById('wav-invite');
    audio.addEventListener('ended', () => {
        setTimeout(() => {  document.getElementById('wav-' + (groupThis + 1)).play(); }, 250);
    }, { once: true });
    audio.play();

}

function switchToRaceTimer() {
    $('#prepare-timer').hide();
    clockElm = $('#race-timer');
    clockElm.text(settings.raceTimer);
    clockElm.show();
}

function switchToPreraceTimer() {
    $('#race-timer').hide();
    clockElm = $('#prepare-timer');
    if( settings.prepareTimer===0 ) clockElm.text('');
    else clockElm.text(settings.prepareTimer);
    clockElm.show();
}

function race() {
    switchToRaceTimer();
    if( settings.withoutTVP ) {
        $('.group-pilots-results').show();
        document.getElementById('wav-counter').play();
    }
}

/*
Результаты после вылета
data[][ pilot, pos, lps, total ]
 */
function results(data, rules) {
    switchToPreraceTimer();
    console.log( 'rules:'+rules);
    for( let i=0; i<4; i++){
        if( !rules.savePlace )  $('#gpp-' + (i+1)).hide();
        if( !rules.saveLaps )  $('#gpl-' + (i+1)).hide();
        if( !rules.saveTime )  $('#gpt-' + (i+1)).hide();
        if( typeof data[i] !== 'undefined' ) {
            $('#gpp-' + (i+1)).val(data[i].pos);
            $('#gpl-' + (i+1)).val(data[i].lps);
            $('#gpt-' + (i+1)).val(Number((data[i].total).toFixed(2)));
        }
    }
    $('.group-pilots-results').css( "display", "block" );
    $('#rerace').show();
    $('#pagination').hide();
    console.log(data);
}

// data[][ Results[laps pos time], Sums[pos ] ]
function showResults(data, loop) {
    console.log(data);
    $('#race').hide();
    $('#menu').hide();
    $('#results').show();

    document.getElementById('result-round').innerHTML= `Раунд ${(loop)}/${settings.raceLoops}`;

    const HTMLOUT = document.getElementById('result-table');
    let x='';
    data.forEach( function(pilot) {
        x += '<span class="setup-pilots-badge badge badge-warning" style="width:120px; margin-right:30px">' + pilot.Name + '</span>';
        for(let i = 0; i < pilot.Results.length; i++){
            x += '<span class="result-table-intermediate">';
            if( pilot.Results[i] !== undefined) {
                if (pilot.Results[i].laps !== false) x += '<span class="result-cell" style="width: 20px;">' + pilot.Results[i].laps + '</span>';
                if (pilot.Results[i].pos !== false) x += '<span class="result-cell" style="width: 20px;">' + pilot.Results[i].pos + '</span>';
                if (pilot.Results[i].time !== false) x += '<span class="result-cell" style="width: 60px;">' + pilot.Results[i].time + '</span>';
            }
            x += '</span>';
        }
        if( typeof pilot.Sums !== 'undefined' ) {
            let style ='';
            if( pilot.Sums.pos<=3 ) style='style="color:red"';
            x += `<span class="result-table-final" ${style}>` + pilot.Sums.pos + '</span>';
        }
        x +='<br>';
    });

    HTMLOUT.innerHTML = x;
}

// Вывести группы пилотов в меню
// pilotsG[][][Name, ]
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

function getFormRulesVal() {
    return Number($("#rulesSelector option:selected").val());
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
    if( settings['judges'] ) $('#checkbox-judge').prop('checked', true);
    if( settings['withoutTVP'] ) $('#checkbox-without-tvp').prop('checked', true);
    if( settings['obsUse'] ) $('#checkbox-obsUse').prop('checked', true);
    if( settings['rules'] ) $('#rulesSelector option[value='+settings['rules']+']').attr('selected','selected');
    $('#obsPort').val(settings.obsPort);
    $('#obsPassword').val(settings.obsPassword);
    $('#obsSceneTVP').val(settings.obsSceneTVP);
    $('#obsSceneWR').val(settings.obsSceneWR);
    $('#obsSceneBreak').val(settings.obsSceneBreak);
    $('#inputPrepareTime').val(settings.prepareTimer);
    $('#inputRaceTime').val(settings.raceTimer);
    $('#inputRaceLaps').val(settings.raceLaps);
    $('#inputLoops').val(settings.raceLoops);
}

/*
Получить данные формы настроек
 */
function getSettingsFromForm(){
    let judges, withoutTVP, obsUse;
    if( $('#checkbox-judge').is(':checked') ) judges=1; else judges=0;
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
    const args = {judges: judges, withoutTVP: withoutTVP, prepareTimer: prepareTimer, raceTimer : raceTimer, raceLoops: raceLoops, rules: rules,
        obsUse:obsUse, obsPort:obsPort, obsSceneTVP:obsSceneTVP, obsSceneWR:obsSceneWR, obsSceneBreak:obsSceneBreak, obsPassword:obsPassword, raceLaps:raceLaps};
    console.log(args);
    return args;
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
const settings = require('electron').remote.getGlobal( "settings" );

ipcRenderer.on('timer-value', (event, arg)=> {
    clockElm.text(arg);
});

ipcRenderer.on('finish', ()=> {
    if( settings.withoutTVP ) document.getElementById('wav-finish').play();
});

ipcRenderer.on('editresults', (event, arg)=> {
    results(arg['stat'], arg['rules']);
});


ipcRenderer.on('show-race', ()=> {
    race();
});

ipcRenderer.on('show-prerace', (event, arg)=> {
    prerace(arg['group'], arg['round'], arg['showNext']);
});

ipcRenderer.on('open-dialog-paths-selected', (event, arg)=> {
    setup.handler.outputSelectedPathsFromOpenDialog(arg);
    // запрос с промисом
    ipcRenderer.invoke('parse-xls', arg).then( result => {
        showPilotsAll(result);
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
    showResults( arg['results'], arg['round'] );
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
                    .then( result => { if ( result===1 ) alert('OK'); else alert('Error');});
            },

            saveSettings: function(){
              const args = getSettingsFromForm();
                ipcRenderer.invoke('save-settings', args).then( () => {
                    alert('Сохранено')
                });

            },

            // Новая гонка
            submitRace: function(){
                const args = getSettingsFromForm();
                //ipcRenderer.sendSync('submit-race',args);

                ipcRenderer.invoke('submit-race', args).then( result => {
                    if( result===1 ) {
                        ipcRenderer.send('start-prerace', {group: 0});
                    }
                    else alert(result);
                });
            },

            // остановить гонку (Х)
            exitRace: function(){
                $('#race').hide();
                $('#results').hide();
                ipcRenderer.invoke('stop-race').then( () => {
                    ipcRenderer.invoke('get-progress').then( result  => {
                        $('menu-this-race').show();
                        showMenu( settings, result.raceLoop, result.groupCur, result.rulesName);
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
                    else alert(result);
                });
            },

            changePage: function(elm){
                //alert(elm.dataset.page);
                ipcRenderer.send('start-prerace',{ group : Number(elm.dataset.page) });
                $('#race').show();
            },

            rerace: function(){
                let group = Number( $('#rerace').data('group') );
                ipcRenderer.send('start-prerace',{ group : group });
                $('#race').show();
            },

            // увеличить время на подготовку
            addPreRaceTime: function() {
                ipcRenderer.send('add-prerace-time');
            },

            // пауза
            pausePreRace: function() {
                ipcRenderer.send('pause-prerace');
            },

            // экспорт результатов в XLS
            exportXLS: function() {
                ipcRenderer.send('export-xls');
            },

            // проверка ввода мест на экране результатов вылета
            validateResults: function(elm) {
                let val = $(elm).val();
                let id = elm.id;
                console.log(id);
                $(".group-pilots-place").each(function () {
                    if ($(this).val() === val && $(this).attr('id') !== id) {
                        $(this).css("color", "red");
                    } else {
                        $(this).css("color", "black");
                    }
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
                $('#export-xls').click( function () {
                    setup.handler.exportXLS();
                });
                $('#pagination').on('click', '.pagination-group', function () {
                    setup.handler.changePage(this);
                });
                $('#rerace').on('click', '#rerace', function () {
                    setup.handler.rerace();
                });
                addEventListener("keyup", function(event) {
                    if (event.code === 'KeyQ') {
                        if ($('#prepare-timer').is(":visible")) {
                            setup.handler.addPreRaceTime();
                        }
                    }
                    else if (event.code === 'Space') {
                        if ($('#prepare-timer').is(":visible")) {
                            setup.handler.pausePreRace();
                        }
                    }
                });
                $( "#rulesSelector" ).change( function() {
                    ipcRenderer.invoke('repackGroups', getFormRulesVal() ).then( (result) => {
                        console.log(result);
                        showPilotsAll(result);
                    });
                    rulesChangeRender();
                });
                //.trigger( "change" );
                $('.group-pilots-place').change( function () {
                    setup.handler.validateResults(this);
                });

                $(function() {  // on ready
                    ipcRenderer.invoke('get-progress').then( result  => {
                        showMenu( settings, result.raceLoop, result.groupCur, result.rulesName);
                    });
                });

            }
        };



        n(function() {
            setup.handler.init();
        })
    }(jQuery); // Immediately Invoked Function Expression.