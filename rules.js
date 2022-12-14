const rulesParams =[
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
        wavNextNum: 1,   // 1 - вызывается группа {номер}, 0 - вызывается следующая группа
        moveAllowed: 1,  // можно удалять и перемещать участников
        lapsLimit: 0    // гонка на Х кругов
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
        wavNextNum: 1,
        lapsLimit: 0,
        moveAllowed: 1,  // можно удалять и перемещать участников
        sortIntermediateResults: 1 // сортировать таблицу промежуточных итогов
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
        groups: 1,  // одна рабочая группа, в которой каждый раунд меняем пилотов
        showNext: 0, // не знаем пилотов - нечего показывать
        wavNextNum: 0,
        moveAllowed: 0,  // можно удалять и перемещать участников
        lapsLimit: 1
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
        wavNextNum: 0,
        lapsLimit: 1,
        moveAllowed: 0,  // можно удалять и перемещать участников
        sortIntermediateResults: 1
    },

];


class rules
{
    constructor(params)
    {
        this.id = params.id;
        this.name = params.name;
        this.saveLaps = params.saveLaps;
        this.saveTime = params.saveTime;
        this.savePlace = params.savePlace;
        this.minPilots = params.minPilots;
        this.maxPilots = params.maxPilots;
        this.showNext = params.showNext;
        this.wavNextNum = params.wavNextNum;
        this.lapsLimit = params.lapsLimit;
        this.moveAllowed = params.moveAllowed;
    }

    findPilotInLoop(pilots, loop, place) {
        //console.log('l', loop, 'p', place);
        for (let i = 0; i < pilots.length; i++) {
            if( pilots[i].Results[loop] !== undefined && pilots[i].Results[loop] !== null ) {
                if (pilots[i].Results[loop].pos === place) return i;
            }
        }
        console.error('ERROR this.findPilotInLoop: не найден L:',loop, 'P:', place  );
        return false;
    }

    /*
{"Id":0,"Name":"John","Results":[{"pos":false,"laps":false,"time":false},{"pos":2,"laps":false,"time":0}],"Sums":{"pos":2,"laps":0,"time":0}},
{"Id":1,"Name":"Tom","Results":[{"pos":1,"laps":false,"time":0},{"pos":false,"laps":false,"time":false}],"Sums":{"pos":1,"laps":0,"time":0}},
{"Id":2,"Name":"John","Results":[{"pos":2,"laps":false,"time":0},{"pos":false,"laps":false,"time":false}],"Sums":{"pos":2,"laps":0,"time":0}},
{"Id":3,"Name":"Tom","Results":[{"pos":false,"laps":false,"time":false},{"pos":4,"laps":false,"time":0}],"Sums":{"pos":4,"laps":0,"time":0}},
{"Id":4,"Name":"John","Results":[{"pos":3,"laps":false,"time":0},{"pos":false,"laps":false,"time":false}],"Sums":{"pos":3,"laps":0,"time":0}},
{"Id":5,"Name":"Tom","Results":[{"pos":false,"laps":false,"time":false},{"pos":1,"laps":false,"time":0}],"Sums":{"pos":1,"laps":0,"time":0}},
{"Id":6,"Name":"John","Results":[{"pos":4,"laps":false,"time":0},{"pos":false,"laps":false,"time":false}],"Sums":{"pos":4,"laps":0,"time":0}},
{"Id":7,"Name":"Tom","Results":[{"pos":false,"laps":false,"time":false},{"pos":3,"laps":false,"time":0}],"Sums":{"pos":3,"laps":0,"time":0}}]

     */

    /*findPilotInGroup(group, loop, place) {
        for (let i = 0, len =  global.settings.groups[group].length; i < len; i++) {
            if (global.settings.pilots[ global.settings.groups[group][i].Num ].Results[loop].pos === place) {
                return global.settings.groups[group][i].Num;
            }
        }
        console.error('ERROR findPilotInGroup: не найден G:',group,'L:',loop, 'P:', place  );
        return false;
    } */
}

class rulesTraining extends rules
{

}

class rulesQualification extends rules
{
    constructor(params) {
        super(params);
        this.sortIntermediateResults = params.sortIntermediateResults;
    }

    // квалификация
    calcFinalPositions( ret )
    {
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

    calcIntermediatePositions( ret, loops){
        return this.calcFinalPositions(ret);
    }
}

class rulesDoubleElemenation8 extends rules
{
    constructor(params) {
        super(params);
        this.loops = params.loops;
        this.groups = params.groups;
    }
     seedGroup(pilots, race){
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
                group[0] = pilots[this.findPilotInLoop( pilots,0, 3)];
                group[1] = pilots[this.findPilotInLoop( pilots, 0, 4)];
                group[2] = pilots[this.findPilotInLoop( pilots, 1, 3)];
                group[3] = pilots[this.findPilotInLoop( pilots, 1, 4)];
                break;
            case 3:
                group[0] = pilots[this.findPilotInLoop( pilots, 0,  1)];
                group[1] = pilots[this.findPilotInLoop( pilots, 0,  2)];
                group[2] = pilots[this.findPilotInLoop( pilots, 1,  1)];
                group[3] = pilots[this.findPilotInLoop( pilots, 1,  2)];
                break;
            case 4:
                group[0] = pilots[this.findPilotInLoop( pilots, 2, 1)];
                group[1] = pilots[this.findPilotInLoop( pilots, 2, 2)];
                group[2] = pilots[this.findPilotInLoop( pilots, 3, 3)];
                group[3] = pilots[this.findPilotInLoop( pilots, 3, 4)];
                break;
            case 5:
                group[0] = pilots[this.findPilotInLoop( pilots, 4,  1)];
                group[1] = pilots[this.findPilotInLoop( pilots, 4,  2)];
                group[2] = pilots[this.findPilotInLoop( pilots, 3,  1)];
                group[3] = pilots[this.findPilotInLoop( pilots, 3,  2)];
                break;
        }
        return group;
    }

    raceTitle(race) {
        const names = [ 'Группа 1', 'Группа 2', 'За 7 и 8 место', 'За выход в финал', 'За выход в финал, 5 и 6 место', 'Финал'];
        return names[race];
    }

// группы для отображения в меню
    seedGroupsOnLoad( pilots ) {
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

// присудить места по завершению DE8
    calcFinalPositions( ret ) {
        // 2 - p3 -> 7, p4 -> 8,
        // 4 - p3 -> 5, p4 -> 6
        // 5 - p1..4
        // loop 0..5
        //присваиваем места
        ret[this.findPilotInLoop(ret, 2, 4)].Sums.pos=8;
        ret[this.findPilotInLoop(ret, 2, 3)].Sums.pos=7;
        ret[this.findPilotInLoop(ret, 4, 4)].Sums.pos=6;
        ret[this.findPilotInLoop(ret, 4, 3)].Sums.pos=5;
        ret[this.findPilotInLoop(ret, 5, 4)].Sums.pos=4;
        ret[this.findPilotInLoop(ret, 5, 3)].Sums.pos=3;
        ret[this.findPilotInLoop(ret, 5, 2)].Sums.pos=2;
        ret[this.findPilotInLoop(ret, 5, 1)].Sums.pos=1;
        //сортируем по возрастанию
        ret.sort( compareDE8 );
        return ret;

        function compareDE8(a, b) {
            if (a.Sums.pos > b.Sums.pos) return 1;
            if (a.Sums.pos < b.Sums.pos) return -1;
        }
    }

    calcIntermediatePositions(ret, loop){
        //console.log('loop'+loop);
        //console.log(JSON.stringify(ret));
        loop--;

        switch( loop ) {
            case 5:
                ret[this.findPilotInLoop(ret, 5, 4)].Sums.pos=4;
                ret[this.findPilotInLoop(ret, 5, 3)].Sums.pos=3;
                ret[this.findPilotInLoop(ret, 5, 2)].Sums.pos=2;
                ret[this.findPilotInLoop(ret, 5, 1)].Sums.pos=1;
            case 4:
                ret[this.findPilotInLoop(ret, 4, 4)].Sums.pos=6;
                ret[this.findPilotInLoop(ret, 4, 3)].Sums.pos=5;
            case 3:
            case 2:
                ret[this.findPilotInLoop(ret, 2, 4)].Sums.pos=8;
                ret[this.findPilotInLoop(ret, 2, 3)].Sums.pos=7;
        }
        return ret;

    }

    setJudges(pilots) {
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

    //найти следующий вылет после загрузки xls
    findRace(pilots)
    {
        let max = 0;
        let len;
        pilots.forEach( function ( pilot ) {
            len = pilot.Results.length;
            if( len>max ) max = len;
        });
        return {loop: max, group: 0};
    }
};

class rulesBattle4 extends rules
{
    constructor(params) {
        super(params);
        this.sortIntermediateResults = params.sortIntermediateResults;
    }

    calcFinalPositions( ret )
    {
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

    calcIntermediatePositions( ret, loops){
        return this.calcFinalPositions(ret);
    }
}

/*const rulesFunc=[];
rulesFunc[1] = {};
rulesFunc[2] = {
    fFinalPos: posQualification,
};
rulesFunc[5] = {
    fFinalPos: posBattle4,
};
rulesFunc[4] ={
    fRaceNext: seedDE8group,    // создать группу для вылета
    fRaceName: nameDE8, // название вылета
    fGroupsOnLoad: seedDE8groupsOnLoad, // создать группы для вывода на экран загрузки
    fFinalPos: posDE8,      // подвести результаты
    fJudges: setJudgesDE8,   // назначить судей
    fFindRace: findRaceDE8 // найти следующий вылет после загрузки xls
};*/

rulesList = { 1:rulesTraining, 2:rulesQualification, 4:rulesDoubleElemenation8, 5:rulesBattle4 };
//module.exports = rulesList;
//module.exports = rulesParams;
// let rules = new rulesList[x](x)


module.exports = {
    rulesList : rulesList,
    rulesParams : rulesParams,
    rulesTraining : rulesTraining,
    rulesQualification : rulesQualification,
    rulesDoubleElemenation8 : rulesDoubleElemenation8,
    rulesBattle4 : rulesBattle4
};


