

const Pilot = require('./pilot.js');
const Store = require('electron-store'); // https://www.npmjs.com/package/electron-store
//const { rulesParams, rulesList } = require('./rules.js');
let rules = require('./rules.js');

// Схема настроек в хранилище
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



module.exports = class Race {

    pilots; // массив пилотов
    groups; // массив групп пилотов
    raceLoop; // текущий раунд
    groupCur; // текущая группа
    inCompetition; // создана ли гонка
    rules;
    settings; // массив настроек гонки
    store; // экземпляр electron-store
    inRace; // сейчас запущена гонка
    pause;



    constructor()
    {
       this.store = new Store({schema});
       this.settings = [];
       this.inRace = 0;
       this.pause =0;
       this.inCompetition =0;
       this.groups = [];

       /*this.pilots = pilots;
       this.raceLoop = raceLoop;
       this.rules = rules;
*/
    }

    loadSettings() {
        // global - эти переменные протаскиваются в рендер
        this.settings.judges = this.store.get('judges', 0);
        this.settings.withoutTVP = this.store.get('withoutTVP', 0);
        this.settings.prepareTimer = this.store.get('prepareTimer', 120);
        this.settings.raceTimer = this.store.get('raceTimer', 0);
        this.settings.raceLaps = this.store.get('raceLaps', 0);
        this.settings.raceLoops = this.store.get('raceLoops', 0);
        this.settings.obsUse = this.store.get('obsUse', 0);
        this.settings.obsPort = this.store.get('obsPort', 4444);
        this.settings.obsPassword = this.store.get('obsPassword', '1234');
        this.settings.obsSceneTVP = this.store.get('obsSceneTVP', 'tvp');
        this.settings.obsSceneWR = this.store.get('obsSceneWR', 'wr');
        this.settings.obsSceneBreak = this.store.get('obsSceneBreak', 'break');
        this.settings.rules_num = this.store.get('rules_num', 1);
        this.settings.channels = this.store.get('channels', ['R1', 'R2', 'R4', 'R5']);

        //let rules = new rulesList[x](x)
        //this.rules = new rulesList[ this.settings.rules_num]( this.settings.rules_num);
        this.rules = new rules.rulesList[ this.settings.rules_num]( rules.rulesParams[this.settings.rules_num]);
        console.log( 'rules loaded: ', this.rules );
        this.pilots = this.store.get('pilots');
        console.log( 'get pilots:');
        console.log( this.pilots);
        this.groups = this.preparePilotsGroups(this.pilots);
        this.groupCur = this.store.get('groupCur',0);
        this.raceLoop = this.store.get('raceLoop',0);
        this.inCompetition = this.store.get('inCompetition', 0);

    }

    getXLSTemplate()
    {
        return [
            {Num: 1, Name: "John", Slot: 1, Group: 1},
            {Num: 2, Name: "Tom", Slot: 2, Group: 1},
            {Num: 3, Name: "John", Slot: 3, Group: 1},
            {Num: 4, Name: "Tom", Slot: 4, Group: 1},
            {Num: 5, Name: "John", Slot: 1, Group: 2},
            {Num: 6, Name: "Tom", Slot: 2, Group: 2},
            {Num: 7, Name: "John", Slot: 3, Group: 2},
            {Num: 8, Name: "Tom", Slot: 4, Group: 2},
        ];
    }

    calcIntermediateResults(final =0)
    {
        let ret = [];
        //console.log( pilots);
        this.pilots.forEach( function(pilot, i) {
            ret[i] = {};
            ret[i].Id = i;
            ret[i].Name = pilot.Name;
            ret[i].Results = [];
            ret[i].Sums = { pos:0, laps:0, time:0 };
            for(let j = 0; j < this.raceLoop; j++){
                ret[i].Results[j] = { pos:false, laps:false, time:false };
                if( pilot.Results[j] !== undefined && pilot.Results[j] !== null ) {
                    if (this.rules.savePlace) ret[i].Results[j].pos = pilot.Results[j].pos;
                    if (this.saveTime) ret[i].Results[j].time = pilot.Results[j].time;
                    if (this.saveLaps) ret[i].Results[j].laps = pilot.Results[j].laps;
                    ret[i].Sums.pos += pilot.Results[j].pos;
                    ret[i].Sums.time += pilot.Results[j].time;
                    ret[i].Sums.laps += pilot.Results[j].laps;
                }
            }

        }, this);

        if( final ) {
            if( this.rules.calcFinalPositions !== undefined ){
                ret = this.rules.calcFinalPositions(ret);
            }
        }
        else{
            if( this.rules.sortIntermediateResults !== undefined && this.rules.sortIntermediateResults ){
                ret = this.rules.calcFinalPositions(ret);
            }
        }
        //console.log( 'prepareResultsForRender:', ret );
        return ret;
    }

    // Записать места в this.pilots[].Place для вывода на экране приглашений
    setPilotsPlaces(res)
    {
        if( this.rules.sortIntermediateResults !== undefined && this.rules.sortIntermediateResults ) {
            res.forEach(function (pilot, i) {
                this.pilots[pilot.Id].Place = i+1;

            }, this);
        }
    }

    parseXLS( xlsjson )
    {
        let result = [];
        let fSetPos = 0;
        if( xlsjson.length < this.rules.minPilots || xlsjson.length>this.rules.maxPilots) return false;

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


        if( this.rules.findRace !== undefined ) {
            let pos = this.rules.findRace(result);
            this.raceLoop = pos.loop;
            this.groupCur = pos.group;
        }
        else{
            let loop = 0;
            let curLoop;
            let groupCur=0;
            let raceLoop=0;

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
                this.raceLoop = loop;
                this.groupCur = 0;
            }
            else{
                this.raceLoop = raceLoop;
                this.groupCur = groupCur;

            }
        }
        console.log(result, this.raceLoop, this.groupCur);
        return result;
    }

// перевести пилотов полученных из XLS / настроек в массив [группа] = [пилот1], [пилот2], ...
// XLS
// Num - id 1..X для удобства
// Name
// Channel - для удобства - чтобы мы могли записать пилота с одним рабочим каналом в нужную ячейку
// Группа - 1..Z

    preparePilotsGroups(pilotsObj) {
        let pilotsG = [];
        if( pilotsObj === undefined ) return pilotsG;

        if( this.rules.seedGroupsOnLoad !== undefined && pilotsObj.length>=this.rules.minPilots && pilotsObj.length<=this.rules.maxPilots) {
            pilotsG = this.rules.seedGroupsOnLoad(pilotsObj);
        }
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
        console.log('prepared groups:');
        console.log(pilotsG);
        return pilotsG;
    }


    /*
    Запись значения настроек
     */
    setSettings(arg) {
        this.settings.judges=arg['judges'];
        this.settings.withoutTVP=arg['withoutTVP'];
        this.settings.rules_num=arg['rules'];
        this.settings.prepareTimer=arg['prepareTimer'];
        this.settings.raceTimer=arg['raceTimer'];
        this.settings.raceLaps=arg['raceLaps'];
        this.settings.raceLoops=arg['raceLoops'];
        this.settings.obsUse=arg['obsUse'];
        this.settings.obsPort=arg['obsPort'];
        this.settings.obsPassword=arg['obsPassword'];
        this.settings.obsSceneTVP=arg['obsSceneTVP'];
        this.settings.obsSceneWR=arg['obsSceneWR'];
        this.settings.obsSceneBreak=arg['obsSceneBreak'];
        this.settings.channels=arg['channels'];
        return 1;
    }

    setPilots(pilots)
    {
        this.pilots = pilots;
    }

    setGroups()
    {
        this.groups = this.preparePilotsGroups(this.pilots);
    }

    setRules(arg)
    {
        this.settings.rules_num = arg;
        this.rules = new rules.rulesList[ this.settings.rules_num]( rules.rulesParams[this.settings.rules_num]);
    }

    setCurrentGroup(group)
    {
        if( group !== false ) {
            if (group < 0) group = this.groups.length - 1;
            if (group > this.groups.length) group = 0;
            this.groupCur = group;
        }
    }


    savePilots()
    {
        this.store.set('pilots', this.pilots);
    }

    saveRules() {
        this.store.set('rules', this.settings.rules_num);
    }

    saveCurrentGroup()
    {
        this.store.set('groupCur', this.groupCur);
    }


    getGroups()
    {
        return this.groups;
    }

    // arg - номер правил
    checkRulesPilotsAmount(arg)
    {
        console.log('arg:'+arg);
        console.log('rulesParams:');
        console.log(rules.rulesParams[arg]);
        console.log('pilots:' + this.pilots.length);
        if( this.pilots.length<rules.rulesParams[arg].minPilots || this.pilots.length>rules.rulesParams[arg].maxPilots ) return false;
        console.log('checkRulesPilotsAmount - success');
        return true;
    }

    getRulesLapsLimit( num )
    {
        return rules.rulesParams[ num ].lapsLimit;
    }

    arePilotsPresent() {
        // todo проверить.
        console.log(this.groups.length);
        if (this.groups.length === 0) return false;
        return true;
    }

    processFormSettings( raceLoops)
    {
        // если в правилах записаны loops - это приоритетней данных из формы
        // todo можно ли перевести на this.rules.loops ?
        if( rules.rulesParams[ this.settings.rules_num ].loops !== undefined ) raceLoops = rules.rulesParams[ this.settings.rules_num ].loops;
        return raceLoops;
    }


    /*
    Сохранение настроек в хранилище
     */
    saveSettings(arg) {
        this.store.set('judges', arg['judges']);
        this.store.set('withoutTVP', arg['withoutTVP']);
        this.store.set('rules', arg['rules']);
        this.store.set('raceTimer', arg['raceTimer']);
        this.store.set('raceLaps', arg['raceLaps']);
        this.store.set('prepareTimer', arg['prepareTimer']);
        this.store.set('raceLoops', arg['raceLoops']);
        this.store.set('obsUse', arg['obsUse']);
        this.store.set('obsPort', arg['obsPort']);
        this.store.set('obsPassword', arg['obsPassword']);
        this.store.set('obsSceneTVP', arg['obsSceneTVP']);
        this.store.set('obsSceneWR', arg['obsSceneWR']);
        this.store.set('obsSceneBreak', arg['obsSceneBreak']);
        this.store.set('channels', arg['channels']);
    }

    clearResults() {
        this.pilots.forEach(function (item) {
            item.Results = [];
        });
    }

    resetRaceVars()
    {
        this.raceLoop = 0;
        this.groupCur = 0;
        this.inCompetition = 1;
        this.store.set('groupCur', this.groupCur);
        this.store.set('raceLoop', this.raceLoop);
        this.store.set('inCompetition', this.inCompetition);
        this.pause = 0;
    }

    isLastRaceLoop()
    {
        if( this.settings.raceLoops && this.raceLoop>=this.settings.raceLoops ) return 1;
        return 0;
    }

    unpause()
    {
        this.pause = 0;
    }

    terminateRace() {
        this.inCompetition = 0;
        this.store.set('inCompetition', this.inCompetition);
    }


    seedGroup()
    {
        if( "seedGroup" in this.rules ) {
            this.groups[0] = this.rules.seedGroup(this.pilots, this.raceLoop);
        }
    }

    addPreraceTime(sec) {
        if( !this.inRace ) {
            this.timerCur += sec;
            console.log('Добавленно '+sec+' секунд на подготовку');
        }
    }

    switchPreracePause() {
        if(this.pause) {
            this.pause = 0;
            console.log( 'Продолжаем' );
            return( this.timerCur);
        }
        else {
            this.pause=1;
            console.log( 'Пауза' );
            return( 'II');
        }
    }

    setAndSaveRaceResultsFromForm( arg )
    {
        let num;
        for( let i=0; i<this.groups[this.groupCur].length; i++ ){
            num = this.groups[this.groupCur][i].Num;
            if( typeof this.pilots[num].Results === 'undefined' ){
                this.pilots[num].Results = [];
            }
            this.pilots[num].Results[this.raceLoop]= arg[i];

        }
        console.log('get-results pilots new: ', this.pilots);
        this.store.set('pilots', this.pilots);

    }

    calcResultsTableForXLS()
    {
        let result = [];
        let raceLoop = this.raceLoop;
        this.pilots.forEach(function (pilot, i) {
            result[i] = {};
            result[i].Num = i;
            result[i].Name = pilot.Name;
            result[i].Channel = pilot.Channel;
            result[i].Group = pilot.Group;
            for (let j = 0; j < raceLoop; j++) {
                if (pilot.Results[j] !== undefined && pilot.Results[j] !== null) {
                    result[i]['P' + j] = pilot.Results[j].pos;
                    result[i]['T' + j] = pilot.Results[j].time;
                    result[i]['L' + j] = pilot.Results[j].laps;
                }
            }
        });
        return result;
    }

    calcResultsHeaderForXLS()
    {
        let header = ["Num", "Name", "Slot", "Group"];
        for( let j=0; j<this.raceLoop; j++){
            header.push('P' + j);
            header.push('T' + j);
            header.push('L' + j);
        }
        return header;
    }

    getRulesName() {
        return this.rules.name;
    }

    // Назначить судей
    /*todo доработать*/
    addJudges(pilotsObj, rulesNum) {
        if (this.rules.setJudges !== undefined) return this.rules.setJudges(pilotsObj);
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


    preparePreraceData() {
        let data = {
            group: [],
        };

        data.groupCur = this.groupCur;
        if( this.rules.groups !== undefined && this.rules.showNext !== undefined && this.rules.groups===1 &&  this.rules.showNext===0 ) data.showGroup=0;
        else data.showGroup=1;
        data.loop = this.raceLoop;
        data.maxLoops = this.settings.raceLoops;
        if( "raceTitle" in this.rules)  {
            data.raceName = this.rules.raceTitle(this.raceLoop);
        }
        else data.raceName ='';


        for( let i=0; i<this.groups[this.groupCur].length; i++ ){
            data.group[i] = {};
            data.group[i].name = this.groups[this.groupCur][i]['Name'];
            data.group[i].channel = this.settings.channels[i];
            data.group[i].resultTxt = ['', ''];
            console.log( this.rules.saveLaps );
            if( this.rules.saveLaps ) {
                let pilot = this.pilots[this.groups[this.groupCur][i]['Num']];
                let results = [];
                let sum=0;
                console.log(pilot.Results);
                for( let j = 0; j < this.raceLoop; j++) {
                    if (pilot.Results[j] !== undefined && pilot.Results[j] !== null) {
                        //data.group[i].results.push(pilot.Results[j].laps);
                        results.push(pilot.Results[j].laps);
                        sum += pilot.Results[j].laps;
                    }
                }
                if( results.length>0) {
                    data.group[i].resultTxt[0] = results.join('-');
                    data.group[i].resultTxt[0] += ' : ' + sum + 'к';
                    data.group[i].resultTxt[1] += pilot.Place;
                }

            }
            else if( this.rules.savePlace ){
                let pilot = this.pilots[this.groups[this.groupCur][i]['Num']];
                let results = [];
                for( let j = 0; j < this.raceLoop; j++) {
                    if (pilot.Results[j] !== undefined && pilot.Results[j] !== null) {
                        results.push(pilot.Results[j].pos);
                    }
                }
                if( results.length>0) {
                    data.group[i].resultTxt[0] = results.join('-');
                    data.group[i].resultTxt[0] = 'м ' + data.group[i].resultTxt;
                }

            }
        }

        let groupNext = this.groupCur + 1;
        let groupMax = this.groups.length;
        if( groupNext >= groupMax ) groupNext = 0;
        data.showNext = this.rules.showNext;
        if( this.rules.showNext ) {
            data.groupNext = [];
            for( let i=0; i<this.groups[groupNext].length; i++ ){
                data.groupNext[i] = {};
                data.groupNext[i].name = this.groups[groupNext][i]['Name'];
            }
        }

        data.groupsQty = this.groups.length;
        data.wawGroup = this.rules.wavNextNum;

        return data;
    }

    setTimer(val)
    {
        this.timerCur = val;
    }

    reduceTimer()
    {
        this.timerCur--;
    }

    getTimer()
    {
        return this.timerCur;
    }

    timeIsUp(){
        return this.timerCur <= 0;
    }

    timeForWarning20s() {
        if( this.inCompetition===1 && this.inRace===0 && this.timerCur===20) return true;
    }

    inRaceOff(){
        this.inRace=0;
    }

    inRaceOn(){
        this.inRace=1;
    }

    areResultsNeeded(){
        if( this.rules.savePlace+this.rules.saveTime+this.rules.saveLaps!==0 ) return true;
    }


    setAndSaveNextGroupAndLoop() {
        this.groupCur++;

        // следующий раунд
        if( (this.rules.groups !== undefined && this.groupCur >= this.rules.groups) || this.groupCur >= this.groups.length) {
            this.groupCur = 0;
            this.raceLoop++;
            if ( this.rules.seedGroup !== undefined) {
                this.groups[0] = this.rules.seedGroup(this.pilots, this.raceLoop);
            }
            this.store.set('groupCur', this.groupCur);
            this.store.set('raceLoop', this.raceLoop);
        } else {
            // следующая группа
            this.store.set('groupCur', this.groupCur);
        }
    }

    isCompetitionOver(){
        if( this.settings.raceLoops && this.raceLoop>=this.settings.raceLoops ) return true;
    }

    isNewLoop(){
        if( (this.rules.groups !== undefined && this.groupCur>=this.rules.groups) || this.groupCur===0) return true;
    }

};