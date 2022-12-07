// общение с TVP
//https://github.com/MylesBorins/node-osc
// Нам нужна 6 версия. В пятой криво принималась кирилица.
// Еще она использует osc-min, который использует new Buffer. И это приводит к  DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
//const { Client, Server } = require('node-osc/dist/lib/index.js'); // В package.json 6 версии node-osc не указан "main": "./dist/lib/index.js", - в electron 10 приходится так
const { Client, Server } = require('node-osc'); // в электрон 15 работает так

module.exports = class Tvp {


    constructor(){
        this.client = new Client('127.0.0.1', 4000);
        this.oscServer = new Server(4001, '127.0.0.1', () => {
            console.log('OSC Server is listening');
        });
    }


    getStatAfterRaceFinished(msg){
        //m.addStringArg( stat[i].pilot );
        //m.addIntArg( stat[i].pos );
        //m.addIntArg( stat[i].lps );
        //m.addFloatArg( stat[i].total );
        let stat = [];
        if (msg.length > 1) {
            let a = 0;
            for (let i = 1; i < msg.length; i += 4) {
                stat[a] = {};
                stat[a].pilot = msg[i];
                stat[a].pos = msg[i + 1];
                stat[a].lps = msg[i + 2];
                stat[a].total = msg[i + 3];
                a++;
            }
        }
        console.log('racefinished: ' + stat);
        return( stat );
    }

    statCorrection(stat, len){
        if (stat === null || stat.length === 0) stat = this._emptyTVPResultCorrection(len);
        else stat = this._zeroCorrection(stat);
        return stat;
    }



    /*
    Отправить сообщение OSC
     */
    sendOsc = function (addr, arg1) {
        console.log('OSC TX: ' + addr + ' ' + arg1);
        this.client.send(addr, arg1);
    };

    /*
    Отправить имя пилота в TVP
     */
    sendPilotName(camid, name) {
        this.sendOsc('/v1/camera/' + camid + '/label', name.toString());
    };

    onCamera(camid) {
        this.sendOsc('/v1/camera/' + camid + '/display', 'on');
    };

    offCamera(camid) {
        this.sendOsc('/v1/camera/' + camid + '/display', 'off');
    };


    sendStartCommand() {
        this.sendOsc('/v1/startrace', 1);
    };

    sendRaceDuration(sec) {
        this.sendOsc('/v1/setdurasecs', sec);
    };

    sendRaceLaps(num) {
        if( num === 0 ) num=100; // если 0 - гонка в tvp финиширует мгновенно
        this.sendOsc('/v1/setduralaps', num);
    };


// TVP может выдать нули в статистике, если некоторые пилоты не вылетили. Это нужно исправить.
// stat : array pilot, pos, lps, total
    _zeroCorrection(stat)
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
    _emptyTVPResultCorrection( num ) {
        let res = [];
        for( let i=0; i< num; i++){
            res[i]={pos:i+1, lps:0, total:0};
        }
        return res;
    }

    sendNames( pilots ){
        for (let i = 0; i < 4; i++) {
            if( i < pilots.length) {
                this.sendPilotName(i + 1, pilots[i]['Name']);
                this.onCamera(i+1);
            }
            else {
                this.sendPilotName(i + 1, '');
                this.offCamera(i+1)
            }
        }
    }

};