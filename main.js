const isDev = process.env.APP_DEV ? (process.env.APP_DEV.trim() == "true") : false;

global.settings = {};
let timerCur; // текущее значение таймера
let groupCur; // текущая группа пилотов
let timeInterval; // таймер race и prerace
let raceLoop=0; // номер прохода через все группы;

const electron = require('electron');
const main = electron.app;  // Модуль контролирующей жизненный цикл нашего приложения.
const BrowserWindow = electron.BrowserWindow;  // Модуль создающий браузерное окно.

const Store = require('electron-store'); // https://www.npmjs.com/package/electron-store
const schema = {
    judges: {
        type: 'number',
        maximum: 1,
        minimum: 0,
        default: 0
    },
    sound: {
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
    raceLoops: {
        type: 'number',
        maximum: 1000,
        minimum: 0,
        default: 0
    },
    /*pilots: {
        type: 'object'
    }*/
};
const store = new Store({schema});
global.settings.judges = store.get('judges', 0);
global.settings.sound = store.get('sound', 0);
global.settings.prepareTimer = store.get('prepareTimer', 120);
global.settings.raceTimer = store.get('raceTimer', 0);
global.settings.pilots = store.get('pilots');
global.settings.raceLoops = store.get('raceLoops', 0);
global.settings.groups = preparePilots(global.settings.pilots);

const osc = require('node-osc');
const client = new osc.Client('127.0.0.1', 4000);

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

    // и загружаем файл index.html нашего веб приложения.
    mainWindow.loadFile('./public/index.html');

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

ipcMain.on('show-open-dialog', (event, arg)=> {

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

ipcMain.on( 'get-xls-tpl', (event, arg)=> {
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
     dialog.showSaveDialog(mainWindow, options).then(result => {
        if( !result.canceled) {
            console.log(result);
            XLSX.writeFile(wb, result.filePath);
            console.log('good end');
        }
    }).catch(err => {
        console.log(err)
    });
    console.log('end');


});


ipcMain.handle( 'parse-xls', async (event, arg)=> {
    const XLSX = require('xlsx'); // https://github.com/SheetJS/sheetjs
    const wb = XLSX.readFile(arg[0]);
    const first_sheet_name = wb.SheetNames[0];
    const ws = wb.Sheets[first_sheet_name];
    const pilotsObj =  XLSX.utils.sheet_to_json(ws);
    store.set('pilots', pilotsObj);
    const groups = preparePilots(pilotsObj);
    global.settings.groups =  groups;
    return groups;
});

ipcMain.handle( 'submit-race', async (event, arg)=> {
    global.settings.judges=arg['judges'];
    global.settings.sound=arg['sound'];
    global.settings.prepareTimer=arg['prepareTimer'];
    global.settings.raceTimer=arg['raceTimer'];
    global.settings.raceLoops=arg['raceLoops'];
    store.set('judges', arg['judges']);
    store.set('sound', arg['sound']);
    store.set('raceTimer', arg['raceTimer']);
    store.set('prepareTimer', arg['prepareTimer']);
    store.set('raceLoops', arg['raceLoops']);
    raceLoop=0;
    if( global.settings.groups.length===0) return 0;
    return 1;
});


ipcMain.on( 'start-prerace', (event, arg)=> {
    let group = arg['group'];
    if( group<0 ) group = global.settings.groups.length-1;
    if( group > global.settings.groups.length) group=0;
    startPrerace(group);
    mainWindow.webContents.send('show-prerace', { group : group });
});

ipcMain.handle( 'stop-race', async (event, arg)=> {
    clearInterval(timeInterval);
    return 1
});


function initializeClock(id, counter, endFunc = function(){return 0}) {

    function updateClock() {
        timerCur--;
        mainWindow.webContents.send('timer-value', timerCur);
        if (timerCur <= 0) {
            clearInterval(timeInterval);
            endFunc();
            //timerCur = 0;
        }
        console.log(timerCur);
    }
    timerCur = counter;
    timeInterval = setInterval(updateClock, 1000);
}

// старт гонки
function startRace() {
    console.log('start: '+global.settings.raceTimer);
    mainWindow.webContents.send('show-race');
    if ( global.settings.raceTimer !==0) {
        if (global.settings.sound) {
            delay(5000, 1).then(res => {
                initializeClock('race-timer', global.settings.raceTimer, finishRace)
            });
        } else {
            initializeClock('race-timer', global.settings.raceTimer, finishRace)
        }
    }

}

/*function nextGroup(group, groupCount) {
    let groupNext = group+1;
    if( groupNext>=groupCount) groupNext=0;
    return groupNext;
}*/

function finishRace() {
    console.log('finish');
    mainWindow.webContents.send('finish');
    let groupNext = groupCur+1;
    if( groupNext>=global.settings.groups.length) {
        groupNext=0;
        if( global.settings.raceLoops ) {
            raceLoop++;
            if(raceLoop>=global.settings.raceLoops) return;
        }
    }
    //const nextGroup = nextGroup(groupCur, global.settings.groups.length);
    startPrerace( groupNext );
    mainWindow.webContents.send('show-prerace', { group : groupNext });
}


function startPrerace(group){
    console.log( 'startPrerace:'+group);
    clearInterval(timeInterval);
    groupCur = group;

    // отправить пилотов в TVP
    for( let i=0; i<global.settings.groups[group].length; i++){
        sendPilotName(i+1, global.settings.groups[group][i]['Name']);
    }

    if(  global.settings.prepareTimer!==0 )  {
        let fn;
        if ( global.settings.raceTimer !==0) fn = startRace;
        initializeClock('prepare-timer', global.settings.prepareTimer, fn);
    }
}


// перевести пилотов полученных из XLS / настроек в массив [группа] = [пилот1], [пилот2], ...
// XLS
// Num - id 1..X для удобства
// Name
// Channel - для удобства - чтобы мы могли записать пилота с одним рабочим каналом в нужную ячейку
// Группа - 1..Z

function preparePilots(pilotsObj) {
    let pilotsG = [];
    if( pilotsObj === undefined ) return pilotsG;
    for (let i = 0; i < pilotsObj.length; i++) {
        if( i<4 ){
            if( pilotsObj[i+pilotsObj.length-4]['Name']!==undefined)
                pilotsObj[i]['Судьи'] = pilotsObj[i+pilotsObj.length-4]['Name'];
            else
                pilotsObj[i]['Судьи'] = '-';
        }
        else{
            if( pilotsObj[i-4]['Name']!==undefined)
                pilotsObj[i]['Судьи'] = pilotsObj[i-4]['Name'];
            else
                pilotsObj[i]['Судьи'] = '-';
        }

        if(  pilotsG[ pilotsObj[i]['Group'] ] === undefined)  {
            pilotsG[ pilotsObj[i]['Group'] ]=[];
        }
        pilotsG[ pilotsObj[i]['Group'] ].push(pilotsObj[i]);
    }
    for( let i = 0; i<pilotsG.length; i++){
        if(pilotsG[i] === undefined) pilotsG.splice(i,1);
    }
    return pilotsG;
}

const sendOsc = function (addr, arg1) {
    console.log('sendOSc: ' + addr + ' ' + arg1);
    client.send(addr, arg1);
};
const sendPilotName = function (camid, name) {
    sendOsc('/v1/camera/' + camid + '/label', name);
};

/**
 * Delays resolution of a Promise by [time] amount, resolving [value]
 *
 * @param time
 * @param value
 * @return {Promise<any>}
 */
function delay(time, value) {
    return new Promise(function(resolve) {
        setTimeout(resolve.bind(null, value), time)
    })
}

function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
}