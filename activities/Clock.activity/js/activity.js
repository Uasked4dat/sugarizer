define(["sugar-web/activity/activity","sugar-web/env","sugar-web/graphics/radiobuttonsgroup","mustache","moment-with-locales.min","webL10n"], function (activity,env,radioButtonsGroup,mustache,moment) {

    // Manipulate the DOM only when it is ready.
    requirejs(['domReady!'], function (doc) {

        // Initialize the activity.
        activity.setup();
        setTranslatedStrings();
        var array=["simple","none","none"];
        env.getEnvironment(function(err, environment) {
            currentenv = environment;
            
            // Load from datastore
            if (!environment.objectId) {
                console.log("New instance");
            } else {
                activity.getDatastoreObject().loadAsText(function(error, metadata, data) {
                    if (error==null && data!=null) {
                        Clock.face=data[0];
                        console.log(data);
                        if(data[0]=="simple"){
                            document.getElementById("simple-clock-button").classList.add("active");
                            document.getElementById("nice-clock-button").classList.remove("active");
                            clock.changeFace("simple");
                        }else{
                            document.getElementById("nice-clock-button").classList.add("active");
                            document.getElementById("simple-clock-button").classList.remove("active");
                            clock.changeFace("nice");
                        }
                        if(data[1]=="block"){
                            document.getElementById("write-time-button").classList.add("active");
                            clock.changeWriteTime(true);
                        }else{
                            document.getElementById("write-time-button").classList.remove("active");
                        }
                        if(data[2]=="block"){
                            document.getElementById("write-date-button").classList.add("active");
                            clock.changeWriteDate(true);
                        }else{
                            document.getElementById("write-date-button").classList.remove("active");
                        }
                    }
                });
            }
        }); 

        var requestAnimationFrame = window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame;

        function Clock() {
            this.face = "simple";
            
            this.handAngles = {
                'hours': 0,
                'minutes': 0,
                'seconds': 0
            };

            this.index = {
                'hours': 0,
                'minutes': 0,
                'seconds': 0
            };
            
            this.manualHandAngles = {
                'hours': 0,
                'minutes': 0,
                'seconds': 0
            };

            this.colors = {
                'black': "#000000",
                'white': "#FFFFFF",
                'hours': "#005FE4",
                'minutes': "#00B20D",
                'seconds': "#E6000A"
            };

            this.setTimeMode = false;
            this.writeTime = false;
            this.writeDate = false;

            // These are calculated on each resize to fill the available space.
            this.size = undefined;
            this.margin = undefined;
            this.radius = undefined;
            this.centerX = undefined;
            this.centerY = undefined;
            this.lineWidthBase = undefined;
            this.handSizes = undefined;
            this.lineWidths = undefined;

            // DOM elements.
            this.textTimeElem = document.getElementById('text-time');
            this.textDateElem = document.getElementById('text-date');
            this.clockCanvasElem = document.getElementById("clock-canvas");
            this.clockContainerElem = this.clockCanvasElem.parentNode;

            this.bgCanvasElem = document.createElement('canvas');
            this.clockContainerElem.insertBefore(this.bgCanvasElem,
                                                 this.clockCanvasElem);

            var that = this;
            window.onresize = function (event) {
                that.updateSizes();
                that.drawBackground();
            };
        }
        
        function setTranslatedStrings() {
            document.getElementById("simple-clock-button").title = l10n_s.get("SimpleClock");
            document.getElementById("nice-clock-button").title = l10n_s.get("NiceClock");
            document.getElementById("write-time-button").title = l10n_s.get("WriteTime");
            document.getElementById("write-date-button").title = l10n_s.get("WriteDate");
            document.getElementById("text-time").innerHTML = l10n_s.get("WhatTime");
        }
       
        Clock.prototype.toggleSetTimeMode = function () {
            this.setTimeMode = !this.setTimeMode
            this.update();
            this.drawHands();
            
        }

        Clock.prototype.start = function (face) {
            this.updateSizes();
            this.drawBackground();
            this.AllHandAngles = {"hours": this.generateHourHandAngles(), "minutes": this.generateMinuteHandAngles(),
            "seconds": this.generateMinuteHandAngles()};
            this.update();
            this.drawHands();
            

            this.previousTime = Date.now();
            this.tick();
        }

        Clock.prototype.tick = function () {
            var currentTime = Date.now();

            // Update each second (1000 miliseconds).
            if ((currentTime - this.previousTime) > 1000) {
                this.previousTime = currentTime;
                this.update();
                this.drawHands();
                if (/Android/i.test(navigator.userAgent) && document.location.protocol.substr(0,4) != "http") {
                    // HACK: Force redraw on Android
                    this.clockCanvasElem.style.display='none';
                    this.clockCanvasElem.offsetHeight;
                    this.clockCanvasElem.style.display='block';
                }
            }
            requestAnimationFrame(this.tick.bind(this));
        }

        Clock.prototype.changeFace = function (face) {
            this.face = face;
            this.drawBackground();
            array[0]=face;
        }


        Clock.prototype.changeWriteTime = function (writeTime) {
            this.writeTime = writeTime;
            if (writeTime) {
                this.textTimeElem.style.display = "block";
            } else {
                this.textTimeElem.style.display = "none";
            }
            array[1]=this.textTimeElem.style.display;
            this.updateSizes();
            this.update();
            this.drawBackground();
        }

        Clock.prototype.changeWriteDate = function (writeDate) {
            this.writeDate = writeDate;
            if (writeDate) {
                this.textDateElem.style.display = "block";
            } else {
                this.textDateElem.style.display = "none";
            }
            array[2]=this.textDateElem.style.display;
            this.updateSizes();
            this.update();
            this.drawBackground();
        }

        Clock.prototype.updateSizes = function () {
            var toolbarElem = document.getElementById("main-toolbar");
            var textContainerElem = document.getElementById("text-container");

            var height = window.innerHeight - (textContainerElem.offsetHeight +
                toolbarElem.offsetHeight) - 1;

            this.size = Math.min(window.innerWidth, height);

            this.clockCanvasElem.width = this.size;
            this.clockCanvasElem.height = this.size;

            this.bgCanvasElem.width = this.size;
            this.bgCanvasElem.height = this.size;

            this.clockContainerElem.style.width = this.size + "px";
            this.clockContainerElem.style.height = this.size + "px";

			this.clockCanvasElem.style.width = (this.size+4) + "px";

            this.margin = this.size * 0.02;
            this.radius = (this.size - (2 * this.margin)) / 2;

            this.centerX = this.radius + this.margin;
            this.centerY = this.radius + this.margin;
            this.lineWidthBase = this.radius / 150;

            this.handSizes = {
                'hours': this.radius * 0.5,
                'minutes': this.radius * 0.7,
                'seconds': this.radius * 0.8
            };

            this.lineWidths = {
                'hours': this.lineWidthBase * 9,
                'minutes': this.lineWidthBase * 6,
                'seconds': this.lineWidthBase * 4
            };
        }

        // Update text and hand angles using the current time.
        Clock.prototype.update = function () {
            var date = new Date();
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var seconds = date.getSeconds();

            var zeroFill = function (number) {
                return ('00' + number).substr(-2);
            };

            var template =
                '<span style="color: {{ colors.hours }}">{{ hours }}' +
                '</span>' +
                ':<span style="color: {{ colors.minutes }}">{{ minutes }}' +
                '</span>' +
                ':<span style="color: {{ colors.seconds }}">{{ seconds }}' +
                '</span>';

            if (this.writeTime) {
                var templateData = {'colors': this.colors,
                                    'hours': zeroFill(hours),
                                    'minutes': zeroFill(minutes),
                                    'seconds': zeroFill(seconds)
                                   }

                this.textTimeElem.innerHTML = mustache.render(template,
                                                              templateData);
            }

            if (this.writeDate) {
				var momentDate = moment(date);
                this.textDateElem.innerHTML = momentDate.format('LLLL').replace(momentDate.format('LT'), '');
            }


            if (!this.setTimeMode) {
                this.handAngles.hours = Math.PI - (Math.PI / 6 * hours +
                    Math.PI / 360 * minutes);
    
                this.handAngles.minutes = Math.PI - Math.PI / 30 * minutes;
                this.handAngles.seconds = Math.PI - Math.PI / 30 * seconds;

                // this.manualHandAngles.minutes = clock.findClosestAngle(this.handAngles.minutes, this.AllHandAngles.minutes)
                // this.manualHandAngles.seconds = clock.findClosestAngle(this.handAngles.seconds, this.AllHandAngles.seconds)
                // this.manualHandAngles.hours = clock.findClosestAngle(this.handAngles.hours, this.AllHandAngles.hours) 
            } else {
                this.handAngles.hours = this.manualHandAngles.hours;
                this.handAngles.minutes = this.manualHandAngles.minutes;
                this.handAngles.seconds = this.manualHandAngles.seconds;

                this.index.hours = this.findAngleIndex(this.handAngles.hours, 'hours')
                this.index.minutes = this.findAngleIndex(this.handAngles.minutes, 'minutes')
                this.index.seconds = this.findAngleIndex(this.handAngles.seconds, 'seconds')
            }
            
        }

        Clock.prototype.generateMinuteHandAngles = function () {
            var minuteHandAngles = []
            for (i = 0; i < 60; i++) {
                //Dealing with valid angles for all hands
                minuteHandAngles.push(Math.PI - Math.PI / 30 * i)
            }
            return minuteHandAngles
        }

        Clock.prototype.generateHourHandAngles = function () {
            hourHandAngles = []
            for (i =0; i<12; i++) {
                for (j=0; j<60; j++) {
                    hourHandAngles.push(this.handAngles.hours = Math.PI - (Math.PI / 6 * i +
                        Math.PI / 360 * j))
                }
            }
            return hourHandAngles
        }

        Clock.prototype.drawBackground = function () {
            if (this.face == "simple") {
                this.drawSimpleBackground();
                this.drawNumbers();
            }
            else {
                this.drawNiceBackground();
            }
            this.drawHands();
        }
        

        // Draw the background of the simple clock.
        //
        // The simple clock background is a white disk, with hours and
        // minutes ticks, and the hour numbers.
        Clock.prototype.drawSimpleBackground = function () {
            var ctx = this.bgCanvasElem.getContext('2d');

            ctx.clearRect(0, 0, this.size, this.size);

            // Simple clock background
            var lineWidthBackground = this.lineWidthBase * 4;
            ctx.lineCap = 'round';
            ctx.lineWidth = lineWidthBackground;
            ctx.strokeStyle = this.colors.black;
            ctx.fillStyle = this.colors.white;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY,
                    this.radius - lineWidthBackground, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            // Clock ticks
            for (var i = 0; i < 60; i++) {
                var inset;
                if (i % 15 === 0) {
                    inset = 0.15 * this.radius;
                    ctx.lineWidth = this.lineWidthBase * 7;
                }
                else if (i % 5 === 0) {
                    inset = 0.12 * this.radius;
                    ctx.lineWidth = this.lineWidthBase * 5;
                }
                else {
                    inset = 0.08 * this.radius;
                    ctx.lineWidth = this.lineWidthBase * 4;
                }

                ctx.lineCap = 'round';
                ctx.beginPath();

                var cos = Math.cos(i * Math.PI / 30);
                var sin = Math.sin(i * Math.PI / 30);
                ctx.save();
                ctx.translate(this.margin, this.margin);
                ctx.moveTo(
                    this.radius + (this.radius - inset) * cos,
                    this.radius + (this.radius - inset) * sin);
                ctx.lineTo(
                    this.radius + (this.radius - ctx.lineWidth) * cos,
                    this.radius + (this.radius - ctx.lineWidth) * sin);

                ctx.stroke();
                ctx.restore();
            }
        }

        Clock.prototype.drawNiceBackground = function () {
            var ctx = this.bgCanvasElem.getContext('2d');

            var niceImageElem = document.createElement('img');
            var that = this;
            var onLoad = function () {
                ctx.clearRect(that.margin, that.margin,
                              that.radius * 2, that.radius * 2);
                ctx.drawImage(niceImageElem, that.margin, that.margin,
                              that.radius * 2, that.radius * 2);
            };
            niceImageElem.addEventListener('load', onLoad, false);
            niceImageElem.src = "clock.svg";
        }

        // Draw the numbers of the hours.
        Clock.prototype.drawNumbers = function () {
            var ctx = this.bgCanvasElem.getContext('2d');

            var fontSize = 30 * this.radius / 160;

            ctx.fillStyle = this.colors.hours;
            ctx.textBaseline = 'middle';
            ctx.font = "bold " + fontSize + "px sans-serif";

            for (var i = 0; i < 12; i++) {
                var cos = Math.cos((i - 2) * Math.PI / 6);
                var sin = Math.sin((i - 2) * Math.PI / 6);
                var text = i + 1;
                var textWidth = ctx.measureText(text).width;

                ctx.save();
                ctx.translate(this.centerX - textWidth / 2, this.centerY);
                ctx.translate(this.radius * 0.75 * cos,
                              this.radius * 0.75 * sin);
                ctx.fillText(text, 0, 0);
                ctx.restore();
            }
        }

        var circleCoordinates = {'hours': {}, 'minutes': {}, 'seconds': {}, 'center': {}}
        // Draw the hands of the analog clocks.
        Clock.prototype.drawHands = function () {
            var ctx = this.clockCanvasElem.getContext("2d");
            
            
            // Clear canvas first.
            
            ctx.clearRect(this.margin, this.margin, this.radius * 2,
                this.radius * 2);

            var handNames = ['hours', 'minutes', 'seconds'];
            for (var i = 0; i < handNames.length; i++) {
                var name = handNames[i];
                ctx.lineCap = 'round';
                ctx.lineWidth = this.lineWidths[name];
                ctx.strokeStyle = this.colors[name];
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, ctx.lineWidth * 0.6, 0,
                        2 * Math.PI);
                ctx.moveTo(this.centerX, this.centerY);
                ctx.lineTo(
                    this.centerX + this.handSizes[name] *
                        Math.sin(this.handAngles[name]),
                    this.centerY + this.handSizes[name] *
                        Math.cos(this.handAngles[name]));
                ctx.stroke();
                if (this.setTimeMode) {
                    ctx.beginPath();
                    var tipX = this.centerX + this.handSizes[name] * Math.sin(this.handAngles[name]);
                    var tipY = this.centerY + this.handSizes[name] * Math.cos(this.handAngles[name]);
                    ctx.arc((tipX + this.centerX) /2, (tipY + this.centerY)/2, this.radius/15, 0, 2 * Math.PI)
                    ctx.fillStyle = "white";
                    ctx.lineWidth = 6;
                    ctx.stroke();
                    ctx.fill();
                    circleCoordinates[handNames[i]]['x'] = (tipX + this.centerX) /2;
                    circleCoordinates[handNames[i]]['y'] = (tipY + this.centerY) /2;
                    circleCoordinates[handNames[i]]["radius"] = this.radius/15;
                    circleCoordinates['center']['centerx'] = this.centerX;
                    circleCoordinates['center']['centery'] = this.centerY;
                }
            }   
        }

        Clock.prototype.findHandAngleFromCoordinates = function(diffX, diffY) {
            // Deals with 180 and 90 degrees manually
            var degree = false
            if (diffX === 0) {
                degree = (diffY > 0) ? 180 : 0;
            } else if (diffY === 0) {
                degree = (diffX > 0) ? 90 : -90;
            } else if (diffX > 0 && diffY > 0) {
                degree = Math.atan(diffY/diffX) * 180 / Math.PI
                degree += 90;
            } else if ((diffX > 0 && diffY < 0) || (diffX < 0 && diffY < 0)) {
                degree = (Math.atan(diffX/diffY) * 180 / Math.PI) * -1
            } else if (diffX < 0 && diffY > 0) {
                degree = Math.atan(diffY/diffX) * 180 / Math.PI
                degree -= 90;
            }
            // Converts angle from degrees into radians
            degree = degree * Math.PI / 180
            return degree
        }

        Clock.prototype.findClosestAngle = function(mouseAngle, handAngles) {
            var current = handAngles[0]
            for (i = 0; i<handAngles.length; i++) {
                if (Math.abs(mouseAngle - handAngles[i] < Math.abs(mouseAngle - current))) {
                    current = handAngles[i]
                }
            }
            return current
        }

        Clock.prototype.findAngleIndex = function(angleValue, handName) {
            for (i = 0; i < 720 ; i++) {
                if (clock.AllHandAngles[handName][i] === angleValue) {
                    return i
                }
            }
        }

        Clock.prototype.updateIndex = function(clickedHand, direction) {
            if (direction && this.index[clickedHand] < this.AllHandAngles[clickedHand].length -1) {
                this.index[clickedHand] += 1
            } else if (direction && this.index[clickedHand] == this.AllHandAngles[clickedHand].length -1) {
                this.index[clickedHand] = 0
            } else if (!direction && this.index[clickedHand] > 0) {
                this.index[clickedHand] -= 1
            } else if (!direction && this.index[clickedHand] == 0) {
                this.index[clickedHand] = this.AllHandAngles[clickedHand].length -1
            }
            this.manualHandAngles[clickedHand] = this.AllHandAngles[clickedHand][this.index[clickedHand]]
        }

        // Create the clock.

        var clock = new Clock();
        clock.start();
        

        // UI controls.

        var simpleClockButton = document.getElementById("simple-clock-button");
        simpleClockButton.onclick = function () {
            clock.changeFace("simple");
        };

        var niceClockButton = document.getElementById("nice-clock-button");
        niceClockButton.onclick = function () {
            clock.changeFace("nice");
        };

        var simpleNiceRadio = new radioButtonsGroup.RadioButtonsGroup(
        [simpleClockButton, niceClockButton]);
        

        var writeTimeButton = document.getElementById("write-time-button");
        writeTimeButton.onclick = function () {
            this.classList.toggle('active');
            var active = this.classList.contains('active');
            clock.changeWriteTime(active);
        };

        var writeDateButton = document.getElementById("write-date-button");
        writeDateButton.onclick = function () {
            this.classList.toggle('active');
            var active = this.classList.contains('active');
            clock.changeWriteDate(active);
        };

        function checkIfClickOnCircle(mouseX, mouseY, hand) {
            var tempReadings = circleCoordinates;
            x = mouseX - tempReadings[hand]['x'] ;
            y = mouseY - tempReadings[hand]['y'] ;
            distance = Math.sqrt(x**2 + y**2)
            if (distance <= tempReadings[hand]['radius']) {
                return true;
            } else {
                return false;
            };
        }

        var ctx = clock.clockCanvasElem.getContext("2d");

        ctx.canvas.addEventListener('mousemove', function (event) {
            var mouseX = event.clientX - canvas.offsetLeft;
            var mouseY = event.clientY - canvas.offsetTop;
            
            if(clock.mouseDown){
                clock.manualHandAngles[clock.clickedHand] = clock.findClosestAngle(clock.mouseAngle, clock.AllHandAngles[clock.clickedHand])
                var diffX = mouseX - clock.centerX;
                var diffY = clock.centerY - mouseY;
                clock.mouseAngle = clock.findHandAngleFromCoordinates(diffX, diffY)

                var hours = clock.findAngleIndex(clock.manualHandAngles.hours, 'hours')
                var minutes = clock.findAngleIndex(clock.manualHandAngles.minutes, 'minutes')
                
                // console.log(clock.index.minutes)
                if (hours !== 0 && minutes !== 0) {
                    if (clock.clickedHand === 'hours' && clock.index.hours > hours) {
                        clock.updateIndex('minutes', false)
                    } else if (clock.clickedHand === 'hours' && clock.index.hours < hours) {
                        clock.updateIndex('minutes', true)
                    } else if (clock.clickedHand === 'minutes' && clock.index.minutes > minutes) {
                        clock.updateIndex('hours', false)
                    } else if (clock.clickedHand === 'minutes' && clock.index.minutes < minutes) {
                        clock.updateIndex('hours', true)
                    }
                    console.log(hours)
                } else {
                    if (clock.clickedHand === 'minutes' && minutes == 0) {
                        clock.updateIndex('hours', true)
                    } 
                    console.log("Hours: ", hours)
                    console.log("minutes:", minutes)
                }

                
                clock.update();
                clock.drawHands();
            }
        });
  
        ctx.canvas.addEventListener('mouseup', function () {
            clock.mouseDown = false;
        });

        ctx.canvas.addEventListener('mousedown', function (event) {
            mouseX = event.clientX - canvas.offsetLeft;
            mouseY = event.clientY - canvas.offsetTop;
            
            
            clickHours = checkIfClickOnCircle(mouseX, mouseY, 'hours');
            clickMinutes = checkIfClickOnCircle(mouseX, mouseY, 'minutes');
            clickSeconds = checkIfClickOnCircle(mouseX, mouseY, 'seconds');

            // deals with overlap of hands
            var names = ['seconds', 'minutes', 'hours'];
            var clickTally = [clickSeconds, clickMinutes, clickHours];
            for (i=0; i<clickTally.length; i++) {
                if (clickTally[i]) {
                    clock.mouseDown = true;
                    clock.clickedHand = names[i]
                    break;
                }
            }
            
        });

        var setTimeMode = document.getElementById("set-time-mode");
        setTimeMode.onclick = function () {
            clock.toggleSetTimeMode();
            document.getElementById('set-time-mode').classList.toggle('active');
        }

        document.getElementById("stop-button").addEventListener('click', function (event) {
            activity.getDatastoreObject().setDataAsText(array);
            activity.getDatastoreObject().save(function (error) {
                if (error === null) {
                    console.log("write done.");
                } else {
                    console.log("write failed.");
                }
            });
        });
    });
});
