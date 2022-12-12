'use strict';

const isDev = process.env.APP_DEV ? (process.env.APP_DEV.trim() === "true") : false;

let timeInterval; // таймер race и prerace

const electron = require('electron');
const main = electron.app;  // Модуль контролирующей жизненный цикл нашего приложения.
const BrowserWindow = electron.BrowserWindow;  // Модуль создающий браузерное окно.
//main.commandLine.appendSwitch('enable-logging');

const os = require('os');
let win32=0; // для лечения бага в Хромиуме под виндой
if( os.platform()==='win32') win32=1;

require('@electron/remote/main').initialize();

const Race = require('./race.js');
let race = new Race();
race.loadSettings();


const Tvp = require('./tvp.js');
let tvp = new Tvp;

tvp.oscServer.on('message', function (msg) {
    console.log(`OSC RX: ${msg}` );
    if( race.inCompetition===1 && race.inRace===1 && !race.settings.withoutTVP && String(msg[0]) === '/racefinished' ) {
        let stat = tvp.getStatAfterRaceFinished(msg);
        stat= tvp.statCorrection( stat, race.groups[race.groupCur].length);
        finishRace(stat);
        console.log('Finish message accepted');
    }
    //oscServer.close();
});


const Obs = require('./obs.js');
let obs = new Obs();


process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason.stack);
    // application specific logging, throwing an error, or other logic here
});

// Определение глобальной ссылки , если мы не определим, окно
// окно будет закрыто автоматически когда JavaScript объект будет очищен сборщиком мусора.
let mainWindow = null;

// Проверяем что все окна закрыты и закрываем приложение.
main.on('window-all-closed', function() {
    // В OS X обычное поведение приложений и их menu bar
    //  оставаться активными до тех пор пока пользователь закроет их явно комбинацией клавиш Cmd + Q
    if (process.platform !== 'darwin') {
        main.quit();
    }
});

// Этот метод будет вызван когда Electron закончит инициализацию
// и будет готов к созданию браузерных окон.
main.on('ready', function() {
    // Создаем окно браузера.
    mainWindow = new BrowserWindow({width: 1240,
        height: 1000,
        backgroundColor: '0',
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,  // вкл .remote
            contextIsolation: false
        },
    });
    require("@electron/remote/main").enable(mainWindow.webContents);


    mainWindow.setMenu(null);

    // и загружаем файл index.html нашего веб приложения.
    mainWindow.loadFile('./public/index.html').then();

    // Открываем DevTools.
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Этот метод будет выполнен когда генерируется событие закрытия окна.
    mainWindow.on('closed', function() {
        // Удаляем ссылку на окно, если ваше приложение будет поддерживать несколько
        // окон вы будете хранить их в массиве, это время
        // когда нужно удалить соответствующий элемент.
        mainWindow = null;
    });
});


const { ipcMain, dialog } = require('electron');

/*
Событие - открытие файла с пилотами
 */
ipcMain.on('show-open-dialog', (event)=> {

    const options = {
        title: 'Open XLS',
        buttonLabel: 'Открыть',
        filters: [
            { name: 'xls', extensions: ['xls', 'xlsx'] }
        ],
        properties: ['openFile'],
    };


    // BUG GtkDialog mapped without a transient parent. This is discouraged. Не знаю, что делать
    dialog.showOpenDialog( mainWindow, options).then(result => {
        if( !result.canceled) event.sender.send('open-dialog-paths-selected', result.filePaths)
    }).catch(err => {
        console.log(err)
    })
});

/*
Событие - Получить шаблон таблицы для регистрации участников
 */
ipcMain.on( 'get-xls-tpl', ()=> {
    console.log('start');
    const XLSX = require('xlsx'); // https://github.com/SheetJS/sheetjs
    let wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet( race.getXLSTemplate(), {header: ["Num", "Name", "Slot", "Group"]});
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const options = {
        defaultPath: '~/tpl.xls',
        title: 'Save XLS template',
        buttonLabel: 'Сохранить',
        filters: [
            { name: 'xls',
              extensions: ['xls']}
        ]
    };
    showSaveDialog( mainWindow, options, wb, XLSX);
    console.log('end');


});

function showSaveDialog( mainWindow, options, wb, XLSX)
{
    dialog.showSaveDialog(mainWindow, options).then(result => {
        if( !result.canceled) {
            console.log(result);
            XLSX.writeFile(wb, result.filePath);
            console.log('good end');
        }
    }).catch(err => {
        console.log(err)
    });

}

/*
Событие - Создать необходимые каналы в OBS
 */
ipcMain.handle( 'obsCreateScenes', async (event, arg)=> {
    await obs.createScenes(arg);
});

/*
Событие - Проверить соединение с OBS
 */
ipcMain.handle( 'obsCheckConnection', async (event, arg)=> {
    // await - ждем результата
    let res = await obs.checkConnection(arg);
    if (res) {
        const {dialog} = require('electron');
        dialog.showMessageBoxSync({'message': 'Подключено', 'type': 'info'});
    } else {
        const {dialog} = require('electron');
        dialog.showErrorBox('Ошибка', 'Нет подключения');
    }

});


ipcMain.handle( 'parse-xls', async (event, arg)=> {
    const XLSX = require('xlsx'); // https://github.com/SheetJS/sheetjs
    const wb = XLSX.readFile(arg[0]);
    const first_sheet_name = wb.SheetNames[0];
    const ws = wb.Sheets[first_sheet_name];
    const pilotsObj =  XLSX.utils.sheet_to_json(ws, {defval: false});
    let pilots = race.parseXLS(pilotsObj);
    if( pilots === false ) { // не валидное кол-во пилотов для данных правил
        dialog.showErrorBox('Ошибка', 'Количество пилотов не соответствует выбранным правилам');
        return false;
    }
    race.setPilots(pilots);
    race.setGroups();
    //global.settings.pilots = addJudges(pilots, global.settings.rules);
    race.savePilots();
    return {groups: race.getGroups(), channels: race.settings.channels};
});

// смена правил, когда пилоты загружены
ipcMain.handle( 'repackGroups', async (event, arg) =>{
    if( !race.checkRulesPilotsAmount(arg) ) {
        dialog.showErrorBox('Ошибка', 'Количество пилотов не соответствует выбранным правилам');
        return false;
    }
    race.setRules(arg);
    race.setGroups();
    //global.settings.pilots = addJudges(global.settings.pilots, arg);
    race.savePilots();
    race.saveRules();
    return {groups: race.getGroups(), channels: race.settings.channels};

});

/*
Событие - запуск гонок
 */
ipcMain.handle( 'submit-race', async (event, arg)=> {
    const { dialog } = require('electron');

    console.log('submit-race input');
    console.log(arg);
    arg = race.processFormSettings(arg);
    race.setSettings(arg);
    if( !race.arePilotsPresent() ) {
        dialog.showErrorBox('Ошибка', 'Загрузите пилотов');
        return false;
    }
    if( !race.checkRulesPilotsAmount(arg.rules_num) ) {
        dialog.showErrorBox('Ошибка', 'Количество пилотов не соответствует выбранным правилам');
        return false;
    }

    race.saveSettings(arg);

    // длительное подключение
    if( arg['obsUse'] ){
        await obs.connect(arg['obsPort'], arg['obsPassword']);
    }

    race.setGroups(); // Перепаковать группы. Они могут быть изменены после прошлой гонки. Например DE8
    race.clearResults();
    race.resetRaceVars();

    if( !arg['withoutTVP']){
        tvp.sendRaceDuration(race.settings.raceTimer);
        if( race.getRulesLapsLimit(race.settings.rules_num) === 0 ) tvp.sendRaceLaps(100);
        else tvp.sendRaceLaps(race.settings.raceLaps);
    }

    console.log('submit-race pilots: ', race.settings.pilots);

    return 1;
});


// подготовка к возобновлению гонки
ipcMain.handle( 'resume-race', async ()=> {
    if( race.isLastRaceLoop() ) {
        const { dialog } = require('electron');
        dialog.showMessageBoxSync({ 'message': 'Гонка завершена', 'type':'info'});
        return 0;
    }
    race.inCompetition=1; // todo del?
    race.unpause();
    if( !race.settings.withoutTVP ){
        tvp.sendRaceDuration(race.settings.raceTimer);
        if( race.getRulesLapsLimit(race.settings.rules_num) === 0 ) tvp.sendRaceLaps(100);
        else tvp.sendRaceLaps(race.settings.raceLaps);
    }
    if( race.settings.obsUse ){
        await obs.connect(race.settings.obsPort, race.settings.obsPassword);
    }
    race.seedGroup();

    return 1;
});

/*
Событие - Сохранить настройки с формы
 */
ipcMain.handle( 'save-settings', async (event, arg)=> {
    race.setSettings(arg);
    race.saveSettings(arg);
    const { dialog } = require('electron');
    dialog.showMessageBoxSync({ 'message': 'Сохранено', 'type':'info'});
    return 1;
});

ipcMain.on( 'save-rules', (event, arg)=> {
    race.setRules(arg);
    race.saveRules();
    return 1;
});


/*
Приглашение пилотов
 */
ipcMain.on( 'start-prerace', (event, arg)=> {
    console.log( 'start-prerace', arg['group']);
    let group = arg['group'];
    race.setCurrentGroup( group );
    race.saveCurrentGroup();
    startPrerace();
});

ipcMain.on( 'start-race', ()=>{
    startRace();
});

ipcMain.handle( 'suspend-race', async ()=> {
    if( race.settings.obsUse ) obs.disconnect(); // на случай обрыва соединения с ОБС по любой причине. Выйдя в меню и вернувшись в гонку - мы переподключаемся.
    clearInterval(timeInterval);
});

ipcMain.on('terminate-race', ()=>{
    race.terminateRace();
});

ipcMain.on( 'add-prerace-time',  ()=> {
    race.addPreraceTime(60);
    return 1
});

ipcMain.on( 'switch-pause-prerace',  ()=> {
    switchPausePrerace();
    return 1
});

ipcMain.on( 'switch-pause-results',  ()=> {
    switchPausePrerace();
    return 1
});

ipcMain.on( 'screenshot-results',  (event, arg)=> {
    takeScreenshot(arg.x, arg.y, arg.width, arg.height);
    return 1;
});


/*
Получить результаты для статистики вызванной из меню
 */
ipcMain.on( 'get-stat',  ()=> {
    if( race.isLastRaceLoop() ) {
        //ИТОГОВЫЙ ИТОГ
        if( race.areResultsNeeded() ) {
            let res = race.calcIntermediateResults(1);
            showFinalResults( res );
        }
        else{
            showRaceEnd();
        }
    }
    else{
        //промежуточный итог
        //let race = new Race(global.settings.pilots, global.settings.rules, raceLoop, rules, rulesFunc);
        let res = race.calcIntermediateResults();
        //race.setPilotsPlaces(res);
        showIntermediateResults(res);
    }
});


ipcMain.handle( 'get-progress',  ()=> {
    return { groups: race.groups, settings: race.settings, inCompetition: race.inCompetition, raceLoop: race.raceLoop, groupCur: race.groupCur, rulesName: race.getRulesName() };
});


ipcMain.handle( 'get-pilot-context-menu',  ()=> {

    return { inCompetition: race.inCompetition, raceLoop: race.raceLoop, groupCur: race.groupCur, rulesName: race.getRulesName() };
});


// Получаем результаты гонки с формы и сохраняем
ipcMain.on( 'get-results',  ( event, arg )=> {
    console.log('get-results: ', arg);
    console.log('get-results pilots: ', race.settings.pilots);
    console.log('get-results groups: ', race.groups);
    console.log('get-result: ', race.groupCur);
    if ( race.validateRaceResultsFromForm(arg['results']) ){
        race.setAndSaveRaceResultsFromForm(arg['results']);

        let fs = require('fs');
        fs.writeFile( './results/'+filenameDate()+'.txt', JSON.stringify(arg['results']), function (err) {
            if (err) return console.log(err);
            console.log('Резултаты записаны в файл');
        });
        nextRace(); // хотел передать имя этой функции сюда как текстовый аргумент, но не получилось вызвать функцию
        // изучить - https://ru.stackoverflow.com/questions/412715/%D0%97%D0%B0%D0%BF%D1%83%D1%81%D0%BA-%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-%D0%BF%D0%BE-%D0%B7%D0%BD%D0%B0%D1%87%D0%B5%D0%BD%D0%B8%D1%8E-%D0%BF%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9
    }
    else {
        switchPausePrerace();
        initializeClock( 2, saveRaceReq);
    }
});

function takeScreenshot( x, y, width, height) {
    mainWindow.webContents
        .capturePage({
            x: x,
            y: y,
            width: width,
            height: height,
        })
        .then((img) => {
            dialog
                .showSaveDialog({
                    title: "Select the File Path to save",
                    defaultPath: '~/results.jpg',
                    buttonLabel: "Save",
                    filters: [
                        {
                            name: "Image Files",
                            extensions: ["jpg"],
                        },
                    ],
                    properties: [],
                })
                .then((file) => {
                    // Stating whether dialog operation was
                    // cancelled or not.
                    console.log(file.canceled);
                    if (!file.canceled) {
                        let fs = require('fs');
                        console.log(file.filePath.toString());
                        fs.writeFile(file.filePath.toString(),
                            img.toJPEG(80), "base64", function (err) {
                                if (err) throw err;
                                console.log("Saved!");
                            });
                    }
                })
                .catch((err) => {
                    console.log(err);
                });
        })
        .catch((err) => {
            console.log(err);
        });

}


// Сохраним текущие результаты в XLS
ipcMain.on( 'export-xls',  ()=> {
    let result = race.calcResultsTableForXLS();
    let header = race.calcResultsHeaderForXLS();

    const XLSX = require('xlsx'); // https://github.com/SheetJS/sheetjs
    let wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(result, {header: header});
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const options = {
        defaultPath: '~/*.xls',
        title: 'Save XLS template',
        buttonLabel: 'Сохранить',
        filters: [
            { name: 'xls',
                extensions: ['xls']}
        ]
    };
    showSaveDialog( mainWindow, options, wb, XLSX);
});


function initializeClock( counter, endFunc = function(){return 0}) {
    function updateClock() {
        if( !race.pause ) {
            race.reduceTimer();
            mainWindow.webContents.send('timer-value', race.getTimer() );
            if ( race.timeIsUp() ) {
                clearInterval(timeInterval);
                endFunc();
            }
            else {
                if( race.timeForWarning20s() ){
                    mainWindow.webContents.send('20togo');
                }
            }
        }
        else {
            mainWindow.webContents.send('timer-value', 'II');
        }
    }
    clearInterval(timeInterval);
    race.setTimer( counter );
    timeInterval = setInterval(updateClock, 1000);
}

/*
 старт гонки
 */
function startRace() {
    clearInterval(timeInterval); // не убирать из-за delay ниже
    race.unpause();
    console.log( 'Start G'+(race.groupCur+1)+'/'+race.groups.length+' L'+(race.raceLoop+1)+'/'+race.settings.raceLoops);

    // отправить пилотов в TVP
    if( !race.settings.withoutTVP ) {
        tvp.sendNames( race.groups[race.groupCur] );
    }

    if( race.settings.obsUse && !race.settings.withoutTVP ) {
        obs.changeScene( race.settings.obsSceneTVP);
    }
    mainWindow.webContents.send('show-race', {rules : race.rules, win32 : win32, raceTimer: race.settings.raceTimer, withoutTVP: race.settings.withoutTVP} );
    if( !race.settings.withoutTVP){
        tvp.sendStartCommand();
    }
    race.inRaceOn(); // после команды на старт!
    if ( race.settings.raceTimer !==0) {
        if (race.settings.withoutTVP) {
            if( win32 ) {
                playSoundCountOnWin();
            }
            delay(5500, 1).then(() => {
                if( race.inRace ) initializeClock( race.settings.raceTimer, finishRace); // проверка на случай смены группы, пока считает таймер
            });
        } else {
            // ждем сообщение от TVP
        }
    }
    console.log( 'startRace is completed');
}


/*
stat : array pilot, pos, lps, total
 */
function finishRace(stat = null)
{
    race.inRaceOff();
    console.log('finishRace: Finish G'+(race.groupCur+1)+'/'+race.groups.length+' L'+(race.raceLoop+1)+'/'+race.settings.raceLoops);
    mainWindow.webContents.send('finish', {withoutTVP:race.settings.withoutTVP});

    // если нужны результаты
    if( race.areResultsNeeded() ){
        console.log( 'finishRace: ', stat );
        if( race.settings.withoutTVP )  stat = null;

        mainWindow.webContents.send('editresults', { stat : stat, rules : race.rules });
        if( race.settings.obsUse ) obs.changeScene( race.settings.obsSceneWR);
        if( race.settings.withoutTVP ) {
            switchPausePrerace();
            initializeClock( 2, saveRaceReq);
        } // автопауза для заполнения таблицы результатов
        else initializeClock(7, saveRaceReq); // пауза для проверки результатов
    }
    else nextRace();
    console.log( 'finishRace is completed');
}



/*
Запрос результатов гонки у рендера
 */
function saveRaceReq() {
    if( race.areResultsNeeded() ) {
        mainWindow.webContents.send('query-results', 'nextRace');
    }
    else nextRace();
}



function showIntermediateResults( res ) {
    mainWindow.webContents.send('show-results', { results : res, round : race.raceLoop, raceLoops: race.settings.raceLoops });
}

function showRaceEnd() {
    mainWindow.webContents.send('show-results', { results : false, round : race.raceLoop, raceLoops: race.settings.raceLoops  });
}

function showFinalResults( res ) {
    mainWindow.webContents.send('show-results', { results : res, round : race.raceLoop, raceLoops: race.settings.raceLoops });
}


function nextRace() {
    // переключить группу
    race.setAndSaveNextGroupAndLoop();
    if( race.isNewLoop() ) {
        if( race.isCompetitionOver() ) {
            //ИТОГОВЫЙ ИТОГ
            if( race.areResultsNeeded() ) {
                let res = race.calcIntermediateResults(1);
                race.setPilotsPlaces(res);
                race.savePilots();
                showFinalResults( res );
            }
            else{
                showRaceEnd();
            }
        }
        else{
            //промежуточный итог
            if( race.areResultsNeeded() ) {
                initializeClock(10, startPrerace);
                let res = race.calcIntermediateResults();
                race.setPilotsPlaces(res);
                race.savePilots();
                showIntermediateResults(res);
            }
            else {
                startPrerace();
            }
        }
    }
    else {
        // следующая группа
        startPrerace();
    }
    console.log( 'nextRace is completed');
}




function startPrerace(){
    race.inRaceOff();
    race.unpause();
    clearInterval(timeInterval);
    if( race.settings.prepareTimer!==0 )  {
        let fn;
        if ( race.settings.raceTimer !==0 ) fn = startRace;
        initializeClock( race.settings.prepareTimer, fn );
    }

    mainWindow.webContents.send('show-prerace', { data: race.preparePreraceData() });

    if( race.settings.obsUse ) {
        obs.changeScene( race.settings.obsSceneWR);
    }
    console.log( 'Invitation G'+(race.groupCur+1)+'/'+race.groups.length+' L'+(race.raceLoop+1)+'/'+race.settings.raceLoops);
    console.log( 'startPrerace is completed');
}



function switchPausePrerace() {
    if( !race.inRace ) {
        let val = race.switchPreracePause();
        mainWindow.webContents.send('timer-value', val);
    }
}


/**
 * Delays resolution of a Promise by [time] amount, resolving [value]
 *
 * @param time
 * @param value
 * @return
 */
function delay(time, value) {
    return new Promise(function(resolve) {
        setTimeout(resolve.bind(null, value), time)
    })
}

function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
}

/*
Подготовить имя файла для логов
 */
function filenameDate() {
    let date = new Date();
    let dd = date.getDate();
    if (dd < 10) dd = '0' + dd;

    let mm = date.getMonth() + 1;
    if (mm < 10) mm = '0' + mm;

    let yy = date.getFullYear() % 100;
    if (yy < 10) yy = '0' + yy;

    let hh = date.getHours();
    if (hh < 10) dd = '0' + hh;
    let min = date.getMinutes();
    if (min < 10) min = '0' + min;
    let ss = date.getSeconds();
    if (ss < 10) ss = '0' + ss;

    return yy + '-' + mm + '-' + dd + '--' + hh + '-' + min + '-' + ss;
}

/* todo недоделана или на выброс?
/*function prepareResultsForRender(pilots, rules_num, final =0) {
    let ret = [];
    //console.log( pilots);
    pilots.forEach( function(pilot, i) {
        ret[i] = {};
        ret[i].Id = i;
        ret[i].Name = pilot.Name;
        ret[i].Results = [];
        ret[i].Sums = { pos:0, laps:0, time:0 };
        for(let j = 0; j < raceLoop; j++){
            ret[i].Results[j] = { pos:false, laps:false, time:false };
            if( pilot.Results[j] !== undefined && pilot.Results[j] !== null ) {
                if (rules[rules_num].savePlace) ret[i].Results[j].pos = pilot.Results[j].pos;
                if (rules[rules_num].saveTime) ret[i].Results[j].time = pilot.Results[j].time;
                if (rules[rules_num].saveLaps) ret[i].Results[j].laps = pilot.Results[j].laps;
//                if( final )
                {
                    ret[i].Sums.pos += pilot.Results[j].pos;
                    ret[i].Sums.time += pilot.Results[j].time;
                    ret[i].Sums.laps += pilot.Results[j].laps;
                }
            }
        }

    });

    if( final ) {
        if( rulesFunc[rules_num] !== undefined && rulesFunc[rules_num].fFinalPos !== undefined ){
            ret = rulesFunc[rules_num].fFinalPos(ret);
        }
    }
    else{
        if( rules[rules_num].sortIntermediateResults !== undefined && rules[rules_num].sortIntermediateResults ){
            ret = rulesFunc[rules_num].fFinalPos(ret);
        }
    }
    //console.log( 'prepareResultsForRender:', ret );
    return ret;
}*/

function compare(a, b) {
    if (a > b) return 1; // если первое значение больше второго
    if (a === b) return 0; // если равны
    if (a < b) return -1; // если первое значение меньше второго
}


// Костыль. Приложение падает под виндой. Пробовал обновлять Node, electron, electron-packager, wine
function playSoundCountOnWin() {
    const sound = require("sound-play");
    const path = require("path");
    const filePath = path.join(__dirname, "/public/data/count.wav");
    sound.play(filePath);
}