'use strict';

const ZigBeeDriver = require('homey-zigbeedriver');

const maxValue = 255;

module.exports = new ZigBeeDriver('tradfri-dimmer', {
    debug: false,
    capabilities: {
    }
});

module.exports.on('initNode', (token)=>{
    const node = module.exports.nodes[token];

    if(node){

        node.instance.endpoints[0]['genLevelCtrl'].bind((err) => {
            if(err) console.log('Something went wrong registering dim bind', err);
        });

        let moving = false;
        let movingSince = null;
        let moveDirection = null;
        let rate = null;
        let value = 255;

        let triggerFlow = debounce((value)=>{

            console.log('movement stopped: ', value / maxValue);
            Homey.manager('flow').triggerDevice('dimmer_rotated', {value: Math.round(value/maxValue*100)/100}, null, node.device_data, function(err, success){
                if(err || success !== true) console.log('err', err, 'success', success);
            });
        }, 200);

        node.instance.on('command', (command)=>{

            console.log(command.command);


            if(command.command == "move" || command.command == "moveWithOnOff"){
                moving = true;
                movingSince = Date.now();
                moveDirection = command.movemode == 0? 1:-1;
                rate = command.rate;
                console.log('moving ', moveDirection);
                return;
            }

            if(command.command == "stop" || command.command == "stopWithOnOff"){
                if(moving == true || Date.now() - movingSince < 3000){

                    let sensitivity = node.settings['sensitivity'];

                    let delta = 0;
                    if(typeof sensitivity === "number" && !isNaN(sensitivity) && sensitivity > .1){
                        delta = (Date.now() - movingSince) / 1000 * rate * node.settings['sensitivity'];
                    }else{
                        delta = (Date.now() - movingSince) / 1000 * rate;
                    }



                    value = value + delta * moveDirection;

                    if(value > maxValue) value = maxValue;
                    if(value < 0) value = 0;

                    moving = false;
                    movingSince = null;
                }
            }

            if(command.command == "moveToLevelWithOnOff"){
                value = command.level;
            }

            triggerFlow(value);

            // let value = 'on';
            // switch(command.command){
            //     case 'on':
            //         value = 'on';
            //         break;
            //     case 'step':
            //         value = command.stepmode == 0? 'dim-up':'dim-down';
            //         break;
            //     case 'offWithEffect':
            //         value = 'off';
            //         break;
            // }
            // console.log(value);
            // Homey.manager('flow').triggerDevice('hue-remote', null, {scene: value}, node.device_data);
        });
    }
});

function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};