'use strict';

const isDev = process.env.APP_DEV ? (process.env.APP_DEV.trim() === "true") : false;

global.settings = {};
let timerCur; // текущее значение таймера
let groupCur; // текущая группа пилотов
let timeInterval; // таймер race и prerace
let raceLoop=0; // номер прохода через все группы;
let inRace = 0; // сейчас запущена гонка
let inCompetition = 0; // создана и запущена серия гонок
let pause = 0;

const electron = require('electron');
const main = electron.app;  // Модуль контролирующей жизненный цикл нашего приложения.
const BrowserWindow = electron.BrowserWindow;  // Модуль создающий браузерное окно.

// Настройки
const Store = require('electron-store'); // https://www.npmjs.com/package/electron-store
const schema = {
    judges: {
        type: 'number',
        maximum: 1,
        minimum: 0,
        default: 0
    },
    withoutTVP: {
        type: 'number',
        maximum: 1,
        minimum: 0,
        default: 0
    },
    prepareTimer: {
        type: 'number',
        maximum: 1200,
        minimum: 0,
        default: 0
    },
    raceTimer: {
        type: 'number',
        maximum: 1200,
        minimum: 0,
        default: 0
    },
    raceLaps: {
        type: 'number',
        maximum: 100,
        minimum: 0,
        default: 0
    },
    raceLoops: {
        type: 'number',
        maximum: 1000,
        minimum: 0,
        default: 10
    },
    obsUse: {
        type: 'number',
        maximum: 1,
        minimum: 0,
        default: 0
    },
    rules: {
        type: 'number',
        maximum: 10,
        minimum: 1,
        default: 1
    }
};



const rules =[
    {},
    {
        id: 1,
        name: 'Тренеровка',
        saveLaps: 0,    // пишем статистику пройденных кругов
        saveTime: 0,    // ...времени
        savePlace: 0,   // ...занятого места
        minPilots: 1,   // участников не меньше
        maxPilots: 100, // участников не больше
        showNext: 1,    // показывать на экране приглашения готовящуюся группу
        wavNextNum: 1   // 1 - вызывается группа {номер}, 0 - вызывается следующая группа
    },
    {
        id: 2,
        name: 'Квалификация',
        saveLaps: 1,
        saveTime: 1,
        savePlace: 0,
        minPilots: 1,
        maxPilots: 100,
        showNext: 1,
        wavNextNum: 1
    },
    {},
    {
        //https://www.multigp.com/wp-content/uploads/2019/04/multigp-double-elim-brackets1.png
        id: 4,
        name: 'Double Elimination 8',
        saveLaps: 0,
        saveTime: 1,
        savePlace: 1,
        minPilots: 8,
        maxPilots: 8,
        loops: 6,
        groups: 1,
        showNext: 0,
        wavNextNum: 0
    },
    {
        id: 5,
        name: 'Турнир 4',
        saveLaps: 0,
        saveTime: 1,
        savePlace: 1,
        minPilots: 1,
        maxPilots: 4,
        showNext: 1,
        wavNextNum: 0
    },

];

const rulesFunc=[];
rulesFunc[1] = {};
rulesFunc[2] = {
    fFinalPos: posQualification,
};
rulesFunc[5] = {
    fFinalPos: posBattle4,
};
rulesFunc[4] ={
    fRaceNext: seedDE8group,    // создать группу для вылета
    fGroupsOnLoad: seedDE8groupsOnLoad, // создать группы для вывода на экран загрузки
    fFinalPos: posDE8,      // подвести результаты
    fJudges: setJudgesDE8,   // назначить судей
    fFindRace: findRaceDE8 // найти следующий вылет после загрузки xls
};

const store = new Store({schema});
loadSettings();

// Общение с TVP
//https://github.com/MylesBorins/node-osc
//const { Client, Server } = require('node-osc');
// Нам нужна 6 версия. В пятой криво принималась кирилица.
// Еще она использует osc-min, который использует new Buffer. И это приводит к  DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
const { Client, Server } = require('node-osc/dist/lib/index.js'); // В package.json 6 версии node-osc не указан "main": "./dist/lib/index.js", - приходится так
const client = new Client('127.0.0.1', 4000);
const oscServer = new Server(4001, '127.0.0.1', () => {
    console.log('OSC Server is listening');
});

oscServer.on('message', function (msg) {
    console.log(`OSC RX: ${msg}` );
    if( inCompetition===1 && inRace===1 && !global.settings.withoutTVP && String(msg[0]) === '/racefinished' ) {
        //m.addStringArg( stat[i].pilot );
        //m.addIntArg( stat[i].pos );
        //m.addIntArg( stat[i].lps );
        //m.addFloatArg( stat[i].total );
        let stat = [];
        if( msg.length >1 ){
            let a=0;
            for (let i = 1; i < msg.length; i+=4) {
                stat[a] = {};
                stat[a].pilot = msg[i];
                stat[a].pos = msg[i+1];
                stat[a].lps = msg[i+2];
                stat[a].total = msg[i+3];
                a++;
            }
        }
        console.log('racefinished: '+stat);
        finishRace(stat);
        console.log('Finish message accepted');
    }
    //oscServer.close();
});

// Общение с OBS
// https://github.com/haganbmj/obs-websocket-js
const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();

// You must add this handler to avoid uncaught exceptions.
obs.on('error', err => {
    console.error('OBS socket error:', err);
});


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
    mainWindow = new BrowserWindow({width: 1200,
        height: 1000,
        backgroundColor: '0',
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true  // вкл .remote
        },
    });

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
    const ws = XLSX.utils.json_to_sheet([
        {Num: 1, Name: "Вася", Channel: 1, Group: 1},
        {Num: 2, Name: "Петя", Channel: 3, Group: 1},
        {Num: 3, Name: "Вася", Channel: 6, Group: 1},
        {Num: 4, Name: "Петя", Channel: 8, Group: 1},
        {Num: 5, Name: "Вася", Channel: 1, Group: 2},
        {Num: 6, Name: "Петя", Channel: 3, Group: 2},
        {Num: 7, Name: "Вася", Channel: 6, Group: 2},
        {Num: 8, Name: "Петя", Channel: 8, Group: 2},
    ], {header: ["Num", "Name", "Channel", "Group"]});
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
    obs.connect({
        address: 'localhost:' + arg['port'],
        password: arg['pass']
    })
    .then( () => obs.send('CreateScene', {'sceneName': arg['TVP']}) )
    .then( () => obs.send('CreateScene', {'sceneName': arg['WR']}) )
    .then( () => obs.send('CreateScene', {'sceneName': arg['Break']}) )
    .then( () => obs.disconnect() );
});

/*
Событие - Проверить соединение с OBS
 */
ipcMain.handle( 'obsCheckConnection', async (event, arg)=> {
    // await - ждем результата
    const res = await obs.connect({
            address: 'localhost:' + arg['port'],
            password: arg['pass']
    }).then(() => {
        obs.disconnect();
        return 1;
    }).catch((error) => {
        console.error(error);
        return 0;
    });
    //client.send( '/v1/camera/1/label','param');
    console.log( 'OBS connection: '+res);
    return res;
});


ipcMain.handle( 'parse-xls', async (event, arg)=> {
    const XLSX = require('xlsx'); // https://github.com/SheetJS/sheetjs
    const wb = XLSX.readFile(arg[0]);
    const first_sheet_name = wb.SheetNames[0];
    const ws = wb.Sheets[first_sheet_name];
    const pilotsObj =  XLSX.utils.sheet_to_json(ws, {defval: false});
    let pilots = parseXLS(pilotsObj, global.settings.rules);
    global.settings.groups = preparePilotsGroups(pilots, global.settings.rules);
    global.settings.pilots = addJudges(pilots, global.settings.rules);
    store.set('pilots', global.settings.pilots);
    return global.settings.groups;
});

ipcMain.handle( 'repackGroups', async (event, arg) =>{
    global.settings.groups = preparePilotsGroups(global.settings.pilots, arg);
    global.settings.pilots = addJudges(global.settings.pilots, global.settings.rules);
    store.set('pilots', global.settings.pilots);
    return global.settings.groups;
});

/*
Событие - запуск гонок
 */
ipcMain.handle( 'submit-race', async (event, arg)=> {
    // если в правилах записаны loops - это приоритетней данных из формы
    if( rules[ global.settings.rules ].loops !== undefined ) arg.raceLoops = rules[ global.settings.rules ].loops;
    setSettings(arg);
    if( global.settings.groups.length===0) return 'Загрузите пилотов';

    if( global.settings.pilots.length<rules[global.settings.rules].minPilots ||
        global.settings.pilots.length>rules[global.settings.rules].maxPilots )
        return 'Количество пилотов не соответствует выбранным правилам';

    saveSettings(arg);

    global.settings.pilots.forEach( function ( item ) {
        item.Results = [];
    });

    raceLoop=0;
    groupCur=0;
    store.set('groupCur', groupCur);
    store.set('raceLoop', raceLoop);

    inCompetition=1;
    pause=0;
    if( !arg['withoutTVP']){
        sendRaceDuration(global.settings.raceTimer);
        if( rules[ global.settings.rules ].saveLaps === 0 ) sendRaceLaps(100);
        else sendRaceLaps(global.settings.raceLaps);
    }
    if( arg['obsUse'] ){
        connectObs(arg['obsPort'], arg['obsPassword']);
    }

    console.log('submit-race pilots: ', global.settings.pilots);

    return 1;
});


ipcMain.handle( 'resume-race', async ()=> {
    if( global.settings.raceLoops && raceLoop>=global.settings.raceLoops) return 'Гонка завершена';
    inCompetition=1;
    pause=0;
    if( !global.settings.withoutTVP ){
        sendRaceDuration(global.settings.raceTimer);
        if( rules[ global.settings.rules ].saveLaps === 0 ) sendRaceLaps(100);
        else sendRaceLaps(global.settings.raceLaps);
    }
    if( global.settings.obsUse ){
        connectObs( global.settings.obsPort, global.settings.obsPassword);
    }
    return 1;
});

/*
Событие - Сохранить настройки с формы
 */
ipcMain.handle( 'save-settings', async (event, arg)=> {
    setSettings(arg);
    saveSettings(arg);
    return 1;
});

/*
Приглашение пилотов
 */
ipcMain.on( 'start-prerace', (event, arg)=> {
    let group = arg['group'];
    if( group !== false ) {
        if (group < 0) group = global.settings.groups.length - 1;
        if (group > global.settings.groups.length) group = 0;
        groupCur = group;
    }
    store.set('groupCur', groupCur);
    startPrerace();
});

ipcMain.on( 'start-race', ()=>{
    startRace();
});

ipcMain.handle( 'stop-race', async ()=> {
    inCompetition=0;
    clearInterval(timeInterval);
});

ipcMain.on( 'add-prerace-time',  ()=> {
    if( !inRace ) addPreraceTime();
    return 1
});

ipcMain.on( 'pause-prerace',  ()=> {
    if( !inRace ) pausePrerace();
    return 1
});

/*
Получить результаты для статистики вызванной из меню
 */
ipcMain.on( 'get-stat',  ()=> {
    if( global.settings.raceLoops && raceLoop>=global.settings.raceLoops) {
        //ИТОГОВЫЙ ИТОГ
        showFinalResults( global.settings.pilots, global.settings.rules );
    }
    else{
        //промежуточный итог
        showIntermediateResults( global.settings.pilots, global.settings.rules );
    }
});


ipcMain.handle( 'get-progress',  ()=> {

    return { raceLoop: raceLoop, groupCur: groupCur, rulesName: getRulesName() };
});

// Получаем результаты гонки с формы и сохраняем
ipcMain.on( 'get-results',  ( event, arg )=> {
    console.log('get-results: ', arg);
    console.log('get-results pilots: ', global.settings.pilots);
    console.log('get-results groups: ', global.settings.groups);
    console.log('get-result: ', groupCur);
    let num;
    for( let i=0; i<global.settings.groups[groupCur].length; i++ ){
        num = global.settings.groups[groupCur][i].Num;
        if( typeof global.settings.pilots[num].Results === 'undefined' ){
            global.settings.pilots[num].Results = [];
        }
        global.settings.pilots[num].Results[raceLoop]= arg['results'][i];

    }
    console.log('get-results pilots new: ', global.settings.pilots);

    store.set('pilots', global.settings.pilots);

    let fs = require('fs');
    fs.writeFile( './results/'+filenameDate()+'.txt', JSON.stringify(arg['results']), function (err) {
        if (err) return console.log(err);
        console.log('Резултаты записаны в файл');
    });
    nextRace(); // хотел передать имя этой функции сюда как текстовый аргумент, но не получилось вызвать функцию
    // изучить - https://ru.stackoverflow.com/questions/412715/%D0%97%D0%B0%D0%BF%D1%83%D1%81%D0%BA-%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B8-%D0%BF%D0%BE-%D0%B7%D0%BD%D0%B0%D1%87%D0%B5%D0%BD%D0%B8%D1%8E-%D0%BF%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9
});

function parseXLS(xlsjson, rules  )
{
    let loop =0;
    let curLoop;
    let result = [];
    let fSetPos = 0;
    xlsjson.forEach( function ( pilot, i ) {
        let p=0;
        let pos, time, laps;
        result[i] = {};
        result[i].Results = [];
        Object.keys(pilot).map(function(objectKey, index) {
            if( objectKey === 'Num' )  { // Запишем Num от 0 и попорядку
                result[i][objectKey] = i;
                return;
            }
            let value = pilot[objectKey];
            if (index<=3 ) result[i][objectKey] = value;
            else {
                if( value === false ) return;
                p = (index-4) % 3;
                switch(p) {
                    case 0:
                        pos=value;
                        break;
                    case 1:
                        time= value;
                        break;
                    case 2:
                        laps= value;
                        result[i].Results[ Math.floor((index-4)/3) ]={ pos: pos, time:time, laps:laps};
                }
            }
        });
    });


    if( rulesFunc[ rules ].fFindRace !== undefined ) {
        let pos = rulesFunc[ rules].fFindRace(result);
        raceLoop = pos.loop;
        groupCur = pos.group;
    }
    else{
        result.forEach( function ( pilot, i ) {
            curLoop = result[i].Results.length;
            if( curLoop < loop) { // если этот пилот пролетел меньше вылетов, чем предыдущий
                fSetPos = 1;
                groupCur = result[i].Group-1;
                raceLoop = curLoop;
            }
            else loop = curLoop;
        });
        if( !fSetPos ) {
            raceLoop = loop;
            groupCur = 0;
        }
    }
    console.log(result, raceLoop, groupCur);
    return result;
}

function findRaceDE8(pilots)
{
    let max = 0;
    let len;
    pilots.forEach( function ( pilot ) {
        len = pilot.Results.length;
        if( len>max ) max = len;
    });
    return {loop: max, group: 0};
}


// Сохраним текущие результаты в XLS
ipcMain.on( 'export-xls',  ()=> {
    let result = [];
    global.settings.pilots.forEach( function ( pilot, i) {
        result[i] = {};
        result[i].Num = i;
        result[i].Name=pilot.Name;
        result[i].Channel = pilot.Channel;
        result[i].Group = pilot.Group;
        for( let j=0; j<raceLoop; j++){
        //pilot.Results.forEach( function(res, j) {
            if( pilot.Results[j] !== undefined && pilot.Results[j] !== null ) {
                result[i]['P' + j] = pilot.Results[j].pos;
                result[i]['T' + j] = pilot.Results[j].time;
                result[i]['L' + j] = pilot.Results[j].laps;
            }
        }
    });

    let header = ["Num", "Name", "Channel", "Group"];
    for( let j=0; j<raceLoop; j++){
        header.push('P' + j);
        header.push('T' + j);
        header.push('L' + j);
    }

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


function initializeClock(id, counter, endFunc = function(){return 0}) {

    function updateClock() {
        if( !pause ) {
            timerCur--;
            mainWindow.webContents.send('timer-value', timerCur);
            if (timerCur <= 0) {
                clearInterval(timeInterval);
                endFunc();
                //timerCur = 0;
            }
        }
        else {
            mainWindow.webContents.send('timer-value', 'II');
        }
    }
    clearInterval(timeInterval);
    timerCur = counter;
    timeInterval = setInterval(updateClock, 1000);
}

/*
 старт гонки
 */
function startRace() {
    clearInterval(timeInterval); // не убирать из-за delay ниже
    pause = 0;
    console.log( 'Start G'+(groupCur+1)+'/'+global.settings.groups.length+' L'+(raceLoop+1)+'/'+global.settings.raceLoops);

    if( global.settings.obsUse && !global.settings.withoutTVP ) {
        changeSceneObs( global.settings.obsSceneTVP);
    }
    mainWindow.webContents.send('show-race', {rules : rules[global.settings.rules]} );
    if( !global.settings.withoutTVP){
        sendStartCommand();
    }
    inRace = 1; // после команды на старт!
    if ( global.settings.raceTimer !==0) {
        if (global.settings.withoutTVP) {
            delay(5000, 1).then(() => {
                initializeClock('race-timer', global.settings.raceTimer, finishRace)
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
    inRace = 0;
    console.log('finishRace: Finish G'+(groupCur+1)+'/'+global.settings.groups.length+' L'+(raceLoop+1)+'/'+global.settings.raceLoops);
    mainWindow.webContents.send('finish');


    // результаты
    //console.log(rules[global.settings.rules].savePlace+rules[global.settings.rules].saveTime+rules[global.settings.rules].saveLaps);
    if( rules[global.settings.rules].savePlace+rules[global.settings.rules].saveTime+rules[global.settings.rules].saveLaps!==0 ){
        console.log( 'finishRace: ', stat );
        console.log( 'finishRace: ', rules[global.settings.rules] );
        if( stat === null || stat.length === 0) stat = emptyCorrection( global.settings.groups[groupCur].length );
        else stat=zeroCorrection(stat);
        console.log( 'correction:', stat);
        mainWindow.webContents.send('editresults', { stat : stat, rules : rules[global.settings.rules] });
        if( global.settings.obsUse ) changeSceneObs( global.settings.obsSceneWR);
        if( global.settings.withoutTVP ) {
            pausePrerace();
            initializeClock('prepare-timer', 3, saveRaceReq);
        } // автопауза для заполнения таблицы результатов
        else initializeClock('prepare-timer', 5, saveRaceReq); // пауза для проверки результатов
    }
    else nextRace();
    console.log( 'finishRace is completed');
}

// TVP может выдать нули в статистике, если некоторые пилоты не вылетили. Это нужно исправить.
// stat : array pilot, pos, lps, total
function zeroCorrection(stat)
{
    let maxP = 0;
    stat.forEach( function (item) {
        if( item.pos>maxP) maxP = item.pos;
    });
    stat.forEach( function (item) {
        if (item.pos === 0) {
            item.pos = maxP + 1;
            maxP++;
        }
    });
    return stat;
}

// TVP может не выдать результат, если все пилоты не вылетели
function emptyCorrection( num) {
    let res = [];
    for( let i=0; i< num; i++){
        res[i]={pos:i+1, lps:0, total:0};
    }
    return res;
}

/*
Запрос результатов гонки у рендера
 */
function saveRaceReq() {
    if( rules[global.settings.rules].savePlace+rules[global.settings.rules].saveTime+rules[global.settings.rules].saveLaps!==0 ) {
        mainWindow.webContents.send('query-results', 'nextRace');
    }
    else nextRace();
}

function findPilotInLoop(pilots, loop, place) {
    //console.log('l', loop, 'p', place);
    for (let i = 0; i < pilots.length; i++) {
        //console.log(pilots[i].Results);
        if( pilots[i].Results[loop] !== undefined) {
            if (pilots[i].Results[loop].pos === place) return i;
        }
    }
    console.error('ERROR findPilotInLoop: не найден L:',loop, 'P:', place  );
    return false;
}

function findPilotInGroup(group, loop, place) {
    for (let i = 0, len =  global.settings.groups[group].length; i < len; i++) {
        if (global.settings.pilots[ global.settings.groups[group][i].Num ].Results[loop].pos === place) {
            return global.settings.groups[group][i].Num;
        }
    }
    console.error('ERROR findPilotInGroup: не найден G:',group,'L:',loop, 'P:', place  );
    return false;
}


function seedDE8group(pilots, race){
//0 - Gr 0
//1 - Gr 1
//2 - [0] Place 3, 4, [1] Place 3, 4
//3 - [0] p 1,2, [1] p 1,2
//4 - [3] p 3,4, [2] p 1,2
//5 - [3] p 1,2, [4] p 1,2

    let group = [];
    switch( race ) {
        case 0:
            group[0] = pilots[1];
            group[1] = pilots[2];
            group[2] = pilots[4];
            group[3] = pilots[6];
            break;
        case 1:
            group[0] = pilots[0];
            group[1] = pilots[3];
            group[2] = pilots[5];
            group[3] = pilots[7];
            break;
        case 2:
            group[0] = pilots[findPilotInLoop( pilots,0, 3)];
            group[1] = pilots[findPilotInLoop( pilots, 0, 4)];
            group[2] = pilots[findPilotInLoop( pilots, 1, 3)];
            group[3] = pilots[findPilotInLoop( pilots, 1, 4)];
            break;
        case 3:
            group[0] = pilots[findPilotInLoop( pilots, 0,  1)];
            group[1] = pilots[findPilotInLoop( pilots, 0,  2)];
            group[2] = pilots[findPilotInLoop( pilots, 1,  1)];
            group[3] = pilots[findPilotInLoop( pilots, 1,  2)];
            break;
        case 4:
            group[0] = pilots[findPilotInLoop( pilots, 2, 1)];
            group[1] = pilots[findPilotInLoop( pilots, 2, 2)];
            group[2] = pilots[findPilotInLoop( pilots, 3, 3)];
            group[3] = pilots[findPilotInLoop( pilots, 3, 4)];
            break;
        case 5:
            group[0] = pilots[findPilotInLoop( pilots, 4,  1)];
            group[1] = pilots[findPilotInLoop( pilots, 4,  2)];
            group[2] = pilots[findPilotInLoop( pilots, 3,  1)];
            group[3] = pilots[findPilotInLoop( pilots, 3,  2)];
            break;
    }
    return group;
}

function seedDE8groupsOnLoad( pilots ) {
    let group = [];
    if( pilots.length>=8) {
        group[0] = [];
        group[1] = [];
        group[0][0] = pilots[1];
        group[0][1] = pilots[2];
        group[0][2] = pilots[4];
        group[0][3] = pilots[6];
        group[1][0] = pilots[0];
        group[1][1] = pilots[3];
        group[1][2] = pilots[5];
        group[1][3] = pilots[7];
    }
    else{ // не валидно
        group[0]=[];
        for (let i = 0; i < pilots.length; i++ ) {
            group[1].push(pilots[i]);
        }
    }

    if( pilots.length>8) { // не валидно
        group[2]=[];
        for (let i = 8; i < pilots.length; i++ ) {
            group[2].push(pilots[i]);
        }
    }
    return group;
}

function setJudgesDE8(pilots) {
    pilots[0].Judges = pilots[1].Name;
    pilots[3].Judges = pilots[2].Name;
    pilots[5].Judges = pilots[4].Name;
    pilots[7].Judges = pilots[6].Name;
    pilots[1].Judges = pilots[0].Name;
    pilots[2].Judges = pilots[3].Name;
    pilots[4].Judges = pilots[5].Name;
    pilots[5].Judges = pilots[7].Name;
    return pilots;
}


function nextRace() {
    // переключить группу
    groupCur++;

    // следующий раунд
    if( (rules[global.settings.rules].groups !== undefined && groupCur>=rules[global.settings.rules].groups) || groupCur>=global.settings.groups.length) {
        groupCur=0;
        raceLoop++;
        if( rulesFunc[ global.settings.rules ].fRaceNext !== undefined)  {
            global.settings.groups[0] = rulesFunc[ global.settings.rules ].fRaceNext(global.settings.pilots, raceLoop);
        }
        store.set('groupCur', groupCur);
        store.set('raceLoop', raceLoop);
        if( global.settings.raceLoops && raceLoop>=global.settings.raceLoops) {
            //ИТОГОВЫЙ ИТОГ
            if( rules[global.settings.rules].savePlace+rules[global.settings.rules].saveTime+rules[global.settings.rules].saveLaps>0 ) {
                showFinalResults(global.settings.pilots, global.settings.rules);
            }
            else{
                mainWindow.webContents.send('show-results', { results : false, round : raceLoop });
            }
        }
        else{
            //промежуточный итог
            if( rules[global.settings.rules].savePlace+rules[global.settings.rules].saveTime+rules[global.settings.rules].saveLaps===0 ) {
                startPrerace();
            }
            else {
                initializeClock('prepare-timer', 5, startPrerace);
                showIntermediateResults( global.settings.pilots, global.settings.rules );
            }
        }
    }
    else {
        // следующая группа
        store.set('groupCur', groupCur);
        startPrerace();
    }
    console.log( 'nextRace is completed');
}


function showIntermediateResults( pilots, rules ) {
    let res = prepareResultsForRender( pilots, rules );
    mainWindow.webContents.send('show-results', { results : res, round : raceLoop });
}


function showFinalResults( pilots, rules ) {
    let res = prepareResultsForRender(pilots, rules, 1);
    mainWindow.webContents.send('show-results', { results : res, round : raceLoop });
}

function startPrerace(){
    pause = 0;
    //clearInterval(timeInterval);
    mainWindow.webContents.send('show-prerace', { group : groupCur, round : raceLoop, showNext : rules[ global.settings.rules ].showNext, wavGroup : rules[ global.settings.rules ].wavNextNum });

    if( global.settings.obsUse ) {
        changeSceneObs( global.settings.obsSceneWR);
    }
    console.log( 'Invitation G'+(groupCur+1)+'/'+global.settings.groups.length+' L'+(raceLoop+1)+'/'+global.settings.raceLoops);

    // отправить пилотов в TVP
    if( !global.settings.withoutTVP ) {
        for (let i = 0; i < 4; i++) {
            if( i < global.settings.groups[groupCur].length) {
                sendPilotName(i + 1, global.settings.groups[groupCur][i]['Name']);
                onCamera(i+1);
            }
            else {
                sendPilotName(i + 1, '');
                offCamera(i+1)
            }
        }
    }

    if(  global.settings.prepareTimer!==0 )  {
        let fn;
        if ( global.settings.raceTimer !==0) fn = startRace;
        initializeClock('prepare-timer', global.settings.prepareTimer, fn);
    }
    console.log( 'startPrerace is completed');
}


function addPreraceTime() {
    timerCur+=60;
    console.log( 'Добавленно 60 секунд на подготовку');
}

function pausePrerace() {
    if(pause) {
        pause = 0;
        mainWindow.webContents.send('timer-value', timerCur);
        console.log( 'Продолжаем' );
    }
    else {
        pause=1;
        mainWindow.webContents.send('timer-value', 'II');
        console.log( 'Пауза' );
    }
}


// перевести пилотов полученных из XLS / настроек в массив [группа] = [пилот1], [пилот2], ...
// XLS
// Num - id 1..X для удобства
// Name
// Channel - для удобства - чтобы мы могли записать пилота с одним рабочим каналом в нужную ячейку
// Группа - 1..Z

function preparePilotsGroups(pilotsObj, rulesNum) {
    let pilotsG = [];
    if( pilotsObj === undefined ) return pilotsG;

    if( rulesFunc[ rulesNum ].fGroupsOnLoad !== undefined ) pilotsG = rulesFunc[ rulesNum ].fGroupsOnLoad(pilotsObj);
    else {
        //стандартное заполнение групп по данным из pilots
        for (let i = 0; i < pilotsObj.length; i++) {
            //Создать группу
            if (pilotsG[pilotsObj[i]['Group']] === undefined) {
                pilotsG[pilotsObj[i]['Group']] = [];
            }
            //Добавить пилота в группу
            pilotsG[pilotsObj[i]['Group']].push(pilotsObj[i]);
        }
        // Удалить пустые группы - сделать порядок 0,1...
        for (let i = 0; i < pilotsG.length; i++) {
            if (pilotsG[i] === undefined) pilotsG.splice(i, 1);
        }
    }
    // pilotsG[group]{Name, Chanel, Group, Num}
    return pilotsG;
}

// Назначить судей
function addJudges(pilotsObj, rulesNum) {
    if (rulesFunc[rulesNum].fJudges !== undefined) return rulesFunc[rulesNum].fJudges(pilotsObj);
    else {
        for (let i = 0; i < pilotsObj.length; i++) {
            if (i < 4) {
                if (pilotsObj[i + pilotsObj.length - 4]['Name'] !== undefined)
                    pilotsObj[i]['Judges'] = pilotsObj[i + pilotsObj.length - 4]['Name'];
                else
                    pilotsObj[i]['Judges'] = '-';
            } else {
                if (pilotsObj[i - 4]['Name'] !== undefined)
                    pilotsObj[i]['Judges'] = pilotsObj[i - 4]['Name'];
                else
                    pilotsObj[i]['Judges'] = '-';
            }
        }
        return pilotsObj;
    }
}

/*
Отправить сообщение OSC
 */
const sendOsc = function (addr, arg1) {
    console.log('OSC TX: ' + addr + ' ' + arg1);
    client.send(addr, arg1);
};

/*
Отправить имя пилота в TVP
 */
const sendPilotName = function (camid, name) {
    sendOsc('/v1/camera/' + camid + '/label', name);
};

const onCamera = function (camid) {
    sendOsc('/v1/camera/' + camid + '/display', 'on');
};

const offCamera = function (camid) {
    sendOsc('/v1/camera/' + camid + '/display', 'off');
};


const sendStartCommand = function () {
    sendOsc('/v1/startrace', 1);
};

const sendRaceDuration = function (sec) {
    sendOsc('/v1/setdurasecs', sec);
};

const sendRaceLaps = function (num) {
    if( num === 0 ) num=100; // если 0 - гонка в tvp финиширует мгновенно
    sendOsc('/v1/setduralaps', num);
};


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
OBS - подключиться
 */
function connectObs(port, pass) {
    obs.connect({
        address: 'localhost:'+port,
        password: pass
    })
        .then(() => {
            console.log(`OBS: We're connected & authenticated.`);

            return obs.send('GetSceneList');
        })
        .then(data => {
            console.log(`${data.scenes.length} Available Scenes!`);
            console.log('Using promises:', data);

            /*data.scenes.forEach(scene => {
                if (scene.name !== data.currentScene) {
                    console.log(`Found a different scene! Switching to Scene: ${scene.name}`);

                    obs.send('SetCurrentScene', {
                        'scene-name': scene.name
                    });
                }
            });*/
        })
        .catch(err => { // Promise convention dicates you have a catch on every chain.
            console.log(err);
        });

    // увидели событие - смена сцены
    obs.on('SwitchScenes', data => {
        console.log(`New Active Scene: ${data.sceneName}`);
    });
}

/*
OBS - сменить сцену
 */
function changeSceneObs(name) {
    obs.send('SetCurrentScene', {
        'scene-name': name
    }).then(r => console.log('OBS SetCurrentScene:', r));
}

/*
Загрузка настроек из хранилища
 */
function loadSettings() {
    // global - эти переменные протаскиваются в рендер
    global.settings.judges = store.get('judges', 0);
    global.settings.withoutTVP = store.get('withoutTVP', 0);
    global.settings.prepareTimer = store.get('prepareTimer', 120);
    global.settings.raceTimer = store.get('raceTimer', 0);
    global.settings.raceLaps = store.get('raceLaps', 0);
    global.settings.pilots = store.get('pilots');
    global.settings.raceLoops = store.get('raceLoops', 0);
    global.settings.obsUse = store.get('obsUse', 0);
    global.settings.obsPort = store.get('obsPort', 4444);
    global.settings.obsPassword = store.get('obsPassword', '1234');
    global.settings.obsSceneTVP = store.get('obsSceneTVP', 'tvp');
    global.settings.obsSceneWR = store.get('obsSceneWR', 'wr');
    global.settings.obsSceneBreak = store.get('obsSceneBreak', 'break');
    global.settings.rules = store.get('rules', 1);
    global.settings.groups = preparePilotsGroups(global.settings.pilots, global.settings.rules);
    groupCur = store.get('groupCur',0);
    raceLoop = store.get('raceLoop',0);
}

/*
Запись значения настроек
 */
function setSettings(arg) {
    global.settings.judges=arg['judges'];
    global.settings.withoutTVP=arg['withoutTVP'];
    global.settings.rules=arg['rules'];
    global.settings.prepareTimer=arg['prepareTimer'];
    global.settings.raceTimer=arg['raceTimer'];
    global.settings.raceLaps=arg['raceLaps'];
    global.settings.raceLoops=arg['raceLoops'];
    global.settings.obsUse=arg['obsUse'];
    global.settings.obsPort=arg['obsPort'];
    global.settings.obsPassword=arg['obsPassword'];
    global.settings.obsSceneTVP=arg['obsSceneTVP'];
    global.settings.obsSceneWR=arg['obsSceneWR'];
    global.settings.obsSceneBreak=arg['obsSceneBreak'];
    return 1;
}

/*
Сохранение настроек в хранилище
 */
function saveSettings(arg) {
    store.set('judges', arg['judges']);
    store.set('withoutTVP', arg['withoutTVP']);
    store.set('rules', arg['rules']);
    store.set('raceTimer', arg['raceTimer']);
    store.set('raceLaps', arg['raceLaps']);
    store.set('prepareTimer', arg['prepareTimer']);
    store.set('raceLoops', arg['raceLoops']);
    store.set('obsUse', arg['obsUse']);
    store.set('obsPort', arg['obsPort']);
    store.set('obsPassword', arg['obsPassword']);
    store.set('obsSceneTVP', arg['obsSceneTVP']);
    store.set('obsSceneWR', arg['obsSceneWR']);
    store.set('obsSceneBreak', arg['obsSceneBreak']);
}

/*
По дготовить имя файла для логов
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

function prepareResultsForRender(pilots, rules_num, final =0) {
    let ret = [];
    //console.log( pilots);
    pilots.forEach( function(pilot, i) {
        ret[i] = {};
        ret[i].Name = pilot.Name;
        ret[i].Results = [];
        if( final ) ret[i].Sums = { pos:0, laps:0, time:0 };
        for(let j = 0; j < raceLoop; j++){
            ret[i].Results[j] = { pos:false, laps:false, time:false };
            if( pilot.Results[j] !== undefined && pilot.Results[j] !== null ) {
                if (rules[rules_num].savePlace) ret[i].Results[j].pos = pilot.Results[j].pos;
                if (rules[rules_num].saveTime) ret[i].Results[j].time = pilot.Results[j].time;
                if (rules[rules_num].saveLaps) ret[i].Results[j].laps = pilot.Results[j].laps;
                if( final ){
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
    console.log( 'prepareResultsForRender:', ret );
    return ret;
}

function compare(a, b) {
    if (a > b) return 1; // если первое значение больше второго
    if (a === b) return 0; // если равны
    if (a < b) return -1; // если первое значение меньше второго
}

function getRulesName() {
    return rules[ global.settings.rules ].name;
}

function posQualification( ret ) {
    ret.sort( compareQ );
    ret.forEach( function(res, i) {
        ret[i].Sums.pos=i+1;
    });
    return ret;

    function compareQ(a, b) {
        if (a.Sums.laps < b.Sums.laps) return 1;
        if (a.Sums.laps > b.Sums.laps) return -1;

        // При равной сумме кругов учтем среднее время круга
        // Если в каком-то раунде время = 0 ( пролетел 0 кругов), то ничего страшного
        if (a.Sums.time < b.Sums.time ) return -1;
        if (a.Sums.time === b.Sums.time ) return 0;
        if (a.Sums.time > b.Sums.time ) return 1;
    }

}

function posBattle4( ret ) {
    ret.sort( compareB4 );
    ret.forEach( function(res, i) {
        ret[i].Sums.pos=i+1;
    });
    return ret;

    function compareB4(a, b) {
        if (a.Sums.pos > b.Sums.pos) return 1;
        if (a.Sums.pos < b.Sums.pos) return -1;

        // При равной сумме кругов учтем среднее время круга
        // Если в каком-то раунде время = 0 ( пролетел 0 кругов), то ничего страшного
        if (a.Sums.time > b.Sums.time ) return -1;
        if (a.Sums.time === b.Sums.time ) return 0;
        if (a.Sums.time < b.Sums.time ) return 1;
    }
}

function posDE8( ret ) {
    // 2 - p3 -> 7, p4 -> 8,
    // 4 - p3 -> 5, p4 -> 6
    // 5 - p1..4
    ret[findPilotInLoop(ret, 2, 4)].Sums.pos=8;
    ret[findPilotInLoop(ret, 2, 3)].Sums.pos=7;
    ret[findPilotInLoop(ret, 4, 4)].Sums.pos=6;
    ret[findPilotInLoop(ret, 4, 3)].Sums.pos=5;
    ret[findPilotInLoop(ret, 5, 4)].Sums.pos=4;
    ret[findPilotInLoop(ret, 5, 3)].Sums.pos=3;
    ret[findPilotInLoop(ret, 5, 2)].Sums.pos=2;
    ret[findPilotInLoop(ret, 5, 1)].Sums.pos=1;
    ret.sort( compareDE8 );
    return ret;

    function compareDE8(a, b) {
        if (a.Sums.pos > b.Sums.pos) return 1;
        if (a.Sums.pos < b.Sums.pos) return -1;
    }
}