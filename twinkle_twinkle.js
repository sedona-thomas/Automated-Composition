var audioCtx;
var offset;

// we start by defining some input (not training) data
TWINKLE_TWINKLE = {
    notes: [
        { pitch: 60, startTime: 0.0, endTime: 0.5 },
        { pitch: 60, startTime: 0.5, endTime: 1.0 },
        { pitch: 67, startTime: 1.0, endTime: 1.5 },
        { pitch: 67, startTime: 1.5, endTime: 2.0 },
        { pitch: 69, startTime: 2.0, endTime: 2.5 },
        { pitch: 69, startTime: 2.5, endTime: 3.0 },
        { pitch: 67, startTime: 3.0, endTime: 4.0 },
        { pitch: 65, startTime: 4.0, endTime: 4.5 },
        { pitch: 65, startTime: 4.5, endTime: 5.0 },
        { pitch: 64, startTime: 5.0, endTime: 5.5 },
        { pitch: 64, startTime: 5.5, endTime: 6.0 },
        { pitch: 62, startTime: 6.0, endTime: 6.5 },
        { pitch: 62, startTime: 6.5, endTime: 7.0 },
        { pitch: 60, startTime: 7.0, endTime: 8.0 },
    ],
    totalTime: 8
};

let numberOfPartials = 5;
let partialDistance = 15;
let modulatorFrequencyValue = 100;
let modulationIndexValue = 100;
let lfoFreq = 2;

function updatePartialNum(value) { numberOfPartials = value; };
function updatePartialDistance(value) { partialSize = value; };
function updateFreq(value) { modulatorFrequencyValue = value; };
function updateIndex(value) { modulationIndexValue = value; };
function updateLfo(value) { lfoFreq = value; };

let activeOscillators = {}
let activeGainNodes = {}
let mode = 'single';
let waveform = 'sine';
let lfo = false;

function midiToFreq(m) { return Math.pow(2, (m - 69) / 12) * 440; }

// buttons to switch modes
const singleButton = document.getElementById("single");
singleButton.addEventListener('click', function () { mode = 'single'; }, false);
const additiveButton = document.getElementById("additive");
additiveButton.addEventListener('click', function () { mode = 'additive'; }, false);
const AMButton = document.getElementById("am");
AMButton.addEventListener('click', function () { mode = 'am'; }, false);
const FMButton = document.getElementById("fm");
FMButton.addEventListener('click', function () { mode = 'fm'; }, false);

// buttons to switch between each waveform
const sineButton = document.getElementById("sine");
sineButton.addEventListener('click', function () { waveform = 'sine'; }, false);
const sawtoothButton = document.getElementById("sawtooth");
sawtoothButton.addEventListener('click', function () { waveform = 'sawtooth'; }, false);
const squareButton = document.getElementById("square");
squareButton.addEventListener('click', function () { waveform = 'square'; }, false);
const triangleButton = document.getElementById("triangle");
triangleButton.addEventListener('click', function () { waveform = 'triangle'; }, false);

// buttons to turn on and off lfo
const lfoOnButton = document.getElementById("lfoOn");
lfoOnButton.addEventListener('click', function () { lfo = true; }, false);
const lfoOffButton = document.getElementById("lfoOff");
lfoOffButton.addEventListener('click', function () { lfo = false; }, false);

function playNote(note) {
    if (mode == "single") {
        playNoteSingle(note);
    }
    else if (mode == "additive") {
        playNoteAdditive(note);
    }
    else if (mode == "am") {
        playNoteAM(note);
    }
    else if (mode == "fm") {
        playNoteFM(note);
    }

    if (activeOscillators[note]) {
        stopNote(note);
    }
}

function playNoteSingle(note) {
    offset = 1;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    // create oscillator and connect to gain node
    const osc = audioCtx.createOscillator();
    osc.frequency.setValueAtTime(midiToFreq(note.pitch), audioCtx.currentTime);
    osc.type = waveform;
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start();

    // saves current gain node and oscillator
    activeGainNodes[note] = [gainNode];
    activeOscillators[note] = [osc];

    if (lfo) {
        let lfo = audioCtx.createOscillator();
        lfo.frequency.value = lfoFreq;
        let lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start();
        activeOscillators[note].push(lfo);
    }

    // attack (keeps total of gain nodes less than 1)
    let gainNodes = Object.keys(activeGainNodes).length;
    gainNode.gain.setTargetAtTime(0.8 / gainNodes, note.startTime + offset, 0.01);
}

function playNoteAdditive(note) {
    // saves current gain node and oscillator
    activeGainNodes[note] = [];
    activeOscillators[note] = [];

    for (let i = 0; i < numberOfPartials; i++) {
        // create gain node and initialize as 0
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

        // create oscillator and connect to gain node
        const osc = audioCtx.createOscillator();
        let freq = midiToFreq(note.pitch) * (i + 1);
        freq += ((i % 2) * -1) * (i + 1) * partialDistance * Math.random();
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.type = waveform;
        osc.connect(gainNode).connect(audioCtx.destination);
        osc.start();
        activeGainNodes[note].push(gainNode);
        activeOscillators[note].push(osc);

        if (lfo) {
            let lfo = audioCtx.createOscillator();
            lfo.frequency.value = lfoFreq;
            let lfoGain = audioCtx.createGain();
            lfoGain.gain.value = 10;
            lfo.connect(lfoGain).connect(osc.frequency);
            lfo.start();
            activeOscillators[note].push(lfo);
        }
    }

    // attack (keeps total of gain nodes less than 1)
    let gainNodes = Object.keys(activeGainNodes).length * numberOfPartials;
    for (let i = 0; i < activeGainNodes[note].length; i++) {
        activeGainNodes[note][i].gain.setTargetAtTime(0.8 / gainNodes, note.startTime + offset, 0.1);
    }
}

function playNoteAM(note) {
    let carrier = audioCtx.createOscillator();
    let modulatorFreq = audioCtx.createOscillator();
    carrier.type = waveform;
    carrier.frequency.setValueAtTime(midiToFreq(note.pitch), audioCtx.currentTime);
    modulatorFreq.frequency.value = modulatorFrequencyValue;

    const modulated = audioCtx.createGain();
    const depth = audioCtx.createGain();
    depth.gain.value = 0.5; //scale modulator output to [-0.5, 0.5]
    modulated.gain.value = 1.0 - depth.gain.value; //a fixed value of 0.5

    // create gain node and initialize as 0
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    modulatorFreq.connect(depth).connect(modulated.gain);
    carrier.connect(modulated);
    modulated.connect(gainNode).connect(audioCtx.destination);

    carrier.start();
    modulatorFreq.start();

    // saves current gain node and oscillator
    activeGainNodes[note] = [gainNode, modulated, depth];
    activeOscillators[note] = [carrier, modulatorFreq];

    if (lfo) {
        let lfo = audioCtx.createOscillator();
        lfo.frequency.value = lfoFreq;
        let lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain).connect(modulatorFreq.frequency);
        lfo.start();
        activeOscillators[note].push(lfo);
    }

    // attack (keeps total of gain nodes less than 1)
    let gainNodes = Object.keys(activeGainNodes).length;
    gainNode.gain.setTargetAtTime(0.8 / gainNodes, note.startTime + offset, 0.1);
}

// playNoteFM(): plays the note for the current keyboard key with FM synthesis
function playNoteFM(note) {
    let modulatorFreq = audioCtx.createOscillator();
    modulatorFreq.frequency.value = modulatorFrequencyValue;

    let modulationIndex = audioCtx.createGain();
    modulationIndex.gain.value = modulationIndexValue;

    let carrier = audioCtx.createOscillator();
    carrier.type = waveform;
    carrier.frequency.value = midiToFreq(note.pitch);

    modulatorFreq.connect(modulationIndex);
    modulationIndex.connect(carrier.frequency);

    // create gain node and initialize as 0
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    carrier.connect(gainNode).connect(audioCtx.destination);

    carrier.start();
    modulatorFreq.start();

    // saves current gain node and oscillator
    activeGainNodes[note] = [gainNode, modulationIndex];
    activeOscillators[note] = [carrier, modulatorFreq];

    if (lfo) {
        let lfo = audioCtx.createOscillator();
        lfo.frequency.value = lfoFreq;
        let lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain).connect(modulatorFreq.frequency);
        lfo.start();
        activeOscillators[note].push(lfo);
    }

    // attack (keeps total of gain nodes less than 1)
    let gainNodes = Object.keys(activeGainNodes).length;
    gainNode.gain.setTargetAtTime(0.8 / gainNodes, note.startTime + offset, 0.1);
}

function stopNote(note) {
    for (let i = 0; i < activeGainNodes[note].length; i++) {
        activeGainNodes[note][i].gain.cancelScheduledValues(note.endTime + offset - 0.05);
        activeGainNodes[note][i].gain.setTargetAtTime(0, note.endTime + offset - 0.05, 0.01);
        delete activeGainNodes[note][i];
    }

    for (let i = 0; i < activeOscillators[note].length; i++) {
        activeOscillators[note][i].stop(note.endTime + offset - 0.05 + 0.1);
        delete activeOscillators[note][i];
    }

    delete activeGainNodes[note];
    delete activeOscillators[note];
}

//to play notes that are generated from .continueSequence
//we need to unquantize, then loop through the list of notes
function playNotes(noteList) {
    noteList = mm.sequences.unquantizeSequence(noteList)
    console.log(noteList.notes)
    noteList.notes.forEach(note => {
        playNote(note);
    });
}

function genNotes() {
    //load a pre-trained RNN model
    music_rnn = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
    music_rnn.initialize();

    //the RNN model expects quantized sequences
    const qns = mm.sequences.quantizeNoteSequence(TWINKLE_TWINKLE, 4);

    //and has some parameters we can tune
    rnn_steps = 40; //including the input sequence length, how many more quantized steps (this is diff than how many notes) to generate 
    rnn_temperature = 1.1; //the higher the temperature, the more random (and less like the input) your sequence will be

    // we continue the sequence, which will take some time (thus is run async)
    // "then" when the async continueSequence is done, we play the notes
    music_rnn.continueSequence(qns, rnn_steps, rnn_temperature).then((sample) => playNotes(mm.sequences.concatenate([qns, sample])));
}

const playButton = document.getElementById("play");
playButton.addEventListener('click', function () {
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    genNotes();
}, false);