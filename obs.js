
module.exports = class Obs {
    obs;

    constructor() {
        // https://github.com/haganbmj/obs-websocket-js
        const OBSWebSocket = require('obs-websocket-js');
        this.obs = new OBSWebSocket();

        // You must add this handler to avoid uncaught exceptions.
        this.obs.on('error', err => {
            console.error('OBS socket error:', err);
        });

        // увидели событие - смена сцены
        this.obs.on('SwitchScenes', data => {
            console.log(`New Active Scene: ${data.sceneName}`);
        });

    }


    async checkConnection(arg) {
        let res = await this.obs.connect({
            address: 'localhost:' + arg['port'],
            password: arg['pass']
        }).then(() => {
            this.obs.disconnect();
            console.log('connected');
            return 1;
        }).catch((error) => {
            console.error(error);
            return 0;
        });
        console.log( 'OBS connection: '+res);
        return res;
    }

    async createScenes(arg) {
        this.obs.connect({
                address: 'localhost:' + arg['port'],
                password: arg['pass']
        })
        .then( () => this.obs.send('CreateScene', {'sceneName': arg['TVP']}) )
            .then( () => this.obs.send('CreateScene', {'sceneName': arg['WR']}) )
                .then( () => this.obs.send('CreateScene', {'sceneName': arg['Break']}) )
                    .then( () => this.obs.disconnect() );
    }

    changeScene(name) {
        this.obs.send('SetCurrentScene', {
            'scene-name': name
        }).then(r => console.log('OBS SetCurrentScene:', r));
    }

    async connect(port, pass) {
        await this.obs.connect({
            address: 'localhost:'+port,
            password: pass
        })
            .then(() => {
                console.log(`OBS: We're connected & authenticated.`);

                //return obs.send('GetSceneList');
            })
            /*.then(data => {
                console.log(`${data.scenes.length} Available Scenes!`);
                console.log('Using promises:', data);*/

            /*data.scenes.forEach(scene => {
                if (scene.name !== data.currentScene) {
                    console.log(`Found a different scene! Switching to Scene: ${scene.name}`);

                    obs.send('SetCurrentScene', {
                        'scene-name': scene.name
                    });
                }
            });*/
            /*})*/
            .catch(err => { // Promise convention dicates you have a catch on every chain.
                console.log(err);
            });
    }

    disconnect() {
        this.obs.disconnect()
    }


};



