<script setup>
import { storeToRefs } from 'pinia';
import Guacamole from 'guacamole-common-js'
import { ref, onMounted, onUnmounted, onUpdated } from 'vue'

import { useAuthStore, useUsersStore, useExperimentsStore } from '@/stores';

const authStore = useAuthStore();
const { user: authUser } = storeToRefs(authStore);

const experimentsStore = useExperimentsStore();
const { experimentList, activeExperiment } = storeToRefs(experimentsStore);

const display = ref()

var tunnel = null;
var client = null;
var guacMouse = null;
var guacKeyboard = null;
var displayElm = null;
var guacDisplay = null;

const scale = 1;

function waitForElement(querySelector, timeout){
  return new Promise((resolve, reject)=>{
    var timer = false;
    var elem = document.querySelector(querySelector);
    if(elem) return resolve(elem.offsetWidth);
    const observer = new MutationObserver(()=>{
      elem = document.querySelector(querySelector)
      if(elem){
        observer.disconnect();
        if(timer !== false) clearTimeout(timer);
        return resolve(elem.offsetWidth);
      }
    });
    observer.observe(document.body, {
      childList: true, 
      subtree: true
    });
    if(timeout) timer = setTimeout(()=>{
      observer.disconnect();
      reject();
    }, timeout);
  });
}

onMounted(() => {

    console.log("ExperimentView: onMounted");

    console.log("Experiment has "+experimentsStore.activeExperiment.resources.length+" elements");

    experimentsStore.activeExperiment.resources.forEach((el, idx) => {
        console.log("...resource index="+idx);
        console.log("...resource type: "+el.type);

        displayElm = display.value[idx];
        console.log("Display elm width is "+displayElm.clientWidth);

        if (el.type=="screen" && !client) {
            console.log("... starting Guacamole client...");
            tunnel = new Guacamole.WebSocketTunnel('ws://' + import.meta.env.VITE_HOST_ADDRESS +':8080/');
            client = new Guacamole.Client(tunnel);

            
            displayElm.appendChild(client.getDisplay().getElement());

            displayElm.addEventListener('contextmenu', e => {
            e.stopPropagation();
            if (e.preventDefault) {
                e.preventDefault();
                }
                e.returnValue = false;
            })

            guacDisplay = client.getDisplay();
            guacDisplay.scale(scale);
            console.log('token='+el.value["token"])
            client.connect('token='+el.value["token"]);
            guacMouse = new Guacamole.Mouse(displayElm);
            guacMouse.onmouseout = () => {
                if (!guacDisplay) return;
                guacDisplay.showCursor(false);
            }

            // allows focusing on the display div so that keyboard doesn't always go to session
            displayElm.onclick = () => {
                displayElm.focus()
            }
            displayElm.onfocus = () => {
                displayElm.className = 'focus'
            }
            displayElm.onblur = () => {
                displayElm.className = ''
            }
            guacKeyboard = new Guacamole.Keyboard(displayElm);
            guacKeyboard.onkeydown = keysym => {
                client.sendKeyEvent(1, keysym);
            };
            guacKeyboard.onkeyup = keysym => {
                client.sendKeyEvent(0, keysym);
            };

            guacMouse.onmousedown = guacMouse.onmouseup = guacMouse.onmousemove = function(mouseState) {
                const scaledMouseState = Object.assign({}, mouseState, {
                x: mouseState.x / scale,
                y: mouseState.y / scale,
                })
                client.sendMouseState(scaledMouseState);
            };
            setTimeout(() => {
                displayElm.focus()
            }, 1000); // $nextTick wasn't enough
/*
            waitForElement("canvas", 10000).then(function (val) {
                
                console.log(displayElm.children[0]);
                handleWindowSizeChange();
                el.loading = false;
            });
            */
        } else if (el.type=="web") {

            //if (displayElm.clientWidth > el.width) {
                console.log("Element width="+el.width+", no scale");

                displayElm.innerHTML='<object type="text/html" data=http://' + import.meta.env.VITE_HOST_ADDRESS + ':' + el.value["serverPort"] + el.path + '?proxytoken='+el.value["proxyToken"] + ' style="width:'+displayElm.clientWidth+'px; height: '+el.height+'px;"></object>';
            /*} else {
                // evaluate scale
                const scale = displayElm.clientWidth/el.width;
                console.log("Element width="+el.width+", scaling by "+scale);

                displayElm.innerHTML='<object type="text/html" data=http://' + import.meta.env.VITE_HOST_ADDRESS + ':' + el.value["serverPort"] + el.path + '?proxytoken='+el.value["proxyToken"] + ' style="width:'+el.width+'px; height: '+el.height+'px; transform-origin: left top; transform: scale('+scale+')"></object>';
            }
                */
            /*
            waitForElement("object", 3000).then(function (val) {
                handleWindowSizeChange();
                el.loading = false;
            });
            */
        }
        var intervalId = setInterval(function(){
            if (!displayElm) return;
            if (!displayElm.children[0])
                return;
            else
                el.loading = false;
            if(displayElm.children[0].style.width!="0px") {
                //do stuff
                clearInterval(intervalId);
                console.log("Content loaded");
                console.log(displayElm.children[0].style.width);
                handleWindowSizeChange();
            }
        }, 500);
    });

    window.addEventListener("resize", debounce(handleWindowSizeChange));
})

onUnmounted(async () => {
    window.removeEventListener("resize", debounce(handleWindowSizeChange));
    console.log('OnUnmounted');
    if (client) {
        console.log('Closing Guacamole client');
        client.disconnect();
    }

    console.log("Stopping experiment "+experimentsStore.activeExperiment.id);
    await experimentsStore.stopExperiment(experimentsStore.activeExperiment.id);
})

function debounce(func){
  var timer;
  return function(event){
    if(timer) clearTimeout(timer);
    timer = setTimeout(func,100,event);
  };
}

const handleWindowSizeChange = () => {
    console.log("handleWindowSizeChange");
    experimentsStore.activeExperiment.resources.forEach((el, idx) => {
        console.log("...resource index="+idx);
        console.log("...resource type: "+el.type);

        displayElm = display.value[idx];
        if (!displayElm) return;
        console.log("Display elm width is "+displayElm.clientWidth);

        var contentElm = displayElm.children[0];
        if (!contentElm) return;

        var contentWidth;

        if (el.type=="screen")
            contentWidth = contentElm.clientWidth;
        else if (el.type == "web")
            contentWidth = el.width;
        
        console.log("Content width is " + contentWidth);

        if (displayElm.clientWidth < contentWidth) {
            console.log("Need to reduce size");
            
            contentElm.style.width = contentWidth + "px";
            console.log(contentElm);
            console.log(contentWidth);
            // evaluate scale
            const scale = displayElm.clientWidth/contentWidth;
            contentElm.style.transformOrigin= "left top";
            contentElm.style.transform = 'scale('+ scale +')';
            
        } else 
            // remove scale
            contentElm.style.transform = 'scale(1)';
    });
}

</script>

<template>
    <!-- <div v-if="activeExperiment.resources[0].type=='screen'" class="viewport" ref="viewport" style="z-index:1; position:absolute"> -->
    <!--<div class="viewport" ref="viewport" style="z-index:1; position:absolute; width:100%; height:100%"> -->
    <div class="viewport" ref="viewport" style="z-index:1; width:100%; height:100%">
        <!--<div v-for="token in activeExperiment.tokenList.tokenList" :key="token.id" class="display" ref="display" tabindex="0" ></div>-->
        <div v-for="res in activeExperiment.resources" :key="res.id">
            <h3>{{ res.description }}</h3>
            <div v-if="res.loading" class="spinner-border"></div>
            <div class="display" ref="display" tabindex="0" style="overflow: hidden; width: 100%; height: 100%"></div>
        </div>
    </div>
    
</template>
