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

var trainingNotes = TWINKLE_TWINKLE;
const SEQUENCE_LENGTH = 20;
const NOTE_LENGTH = 0.5;

var markovChain;
var markovChain_order1;
var states;
var order = 1;

var audioCtx;
var activeOscillators = {}
var activeGainNodes = {}
var offset = 1;
var mode = 'single';
var waveform = 'sine';
var lfo = false;
var numberOfPartials = 5;
var partialDistance = 15;
var modulatorFrequencyValue = 100;
var modulationIndexValue = 100;
var lfoFreq = 2;

function midiToFreq(m) { return Math.pow(2, (m - 69) / 12) * 440; }

function updateOrder(value) { order = value; };
function updateTrainingNotes(file) { trainingNotes = blobToNoteSequence(file); }
function updatePartialNum(value) { numberOfPartials = value; };
function updatePartialDistance(value) { partialSize = value; };
function updateFreq(value) { modulatorFrequencyValue = value; };
function updateIndex(value) { modulationIndexValue = value; };
function updateLfo(value) { lfoFreq = value; };

const playButton = document.getElementById("play");
playButton.addEventListener('click', function () {
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    makeMarkovChain(trainingNotes);
    let song = genNotes(trainingNotes);
    song.notes.forEach(note => {
        playNote(note);
    });
    console.log(song);
}, false);

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

function genNotes(noteList) {
    let newNotes = copyNoteList(noteList);
    let sequenceEnd = newNotes.notes.length + SEQUENCE_LENGTH;
    for (i = newNotes.notes.length; i < sequenceEnd; i++) {
        const newNoteCopy = newNote(newNotes);
        newNotes.notes.push(newNoteCopy);
        newNotes.totalTime = newNoteCopy.endTime;
    }
    return newNotes;
}

function makeMarkovChain(noteList) {
    getStates(noteList);
    makeMarkovChainOrder1(noteList);
    makeMarkovChainOrderN();
}

function makeMarkovChainOrderN() {
    markovChain = makeIdentityMatrix(Object.keys(states).length);
    for (i = 0; i < order; i++) {
        markovChain = multiplyMatrices(markovChain, markovChain_order1);
    }
}

function makeMarkovChainOrder1(noteList) {
    numOfNotes = Object.keys(states).length;
    markovChain_order1 = makeZeroMatrix(numOfNotes, numOfNotes);
    counts = getNGramCounts(noteList);
    for (i = 0; i < numOfNotes; i++) {
        for (j = 0; j < numOfNotes; j++) {
            markovChain_order1[i][j] = counts[1][i][j] / counts[0][i];
        }
    }
}

function getStates(noteList) {
    states = {};
    let pitchSet = [];
    noteList.notes.forEach(note => {
        if (!pitchSet.includes(note.pitch)) {
            pitchSet.push(note.pitch);
        }
    });
    pitchSet.sort();
    for (i = 0; i < pitchSet.length; i++) {
        states[pitchSet[i]] = i;
    }
}

function getNGramCounts(noteList) {
    numOfNotes = Object.keys(states).length;
    unigram_counts = new Array(numOfNotes).fill(0);
    bigram_counts = makeZeroMatrix(numOfNotes, numOfNotes);
    let i;
    for (i = 0; i < noteList.notes.length - 1; i++) {
        bigram = [states[noteList.notes[i].pitch], states[noteList.notes[i + 1].pitch]];
        unigram_counts[bigram[0]]++;
        bigram_counts[bigram[0]][bigram[1]]++;
    }
    if (noteList.notes.length > 0) {
        unigram_counts[noteList.notes[i].pitch]++;
    }
    return [unigram_counts, bigram_counts];
}

function newNote(noteList) {
    let newNote = JSON.parse(JSON.stringify(noteList.notes[i - 1]));
    newNote.pitch = getNextNote(newNote.pitch);
    newNote.startTime = newNote.endTime;
    newNote.endTime = newNote.startTime + NOTE_LENGTH;
    return newNote;
}

function getNextNote(pitch) {
    randomNote = Math.random();
    note = [0, markovChain[states[pitch]][0]];
    while (note[1] < randomNote) {
        note[0]++;
        note[1] += markovChain[states[pitch]][note[0]];
    }
    return parseInt(Object.keys(states)[note[0]]);
}

function copyNoteList(noteList) {
    let notesCopy = { notes: [], totalTime: 0 };
    noteList.notes.forEach(note => {
        notesCopy.notes.push(note);
        notesCopy.totalTime = note.endTime;
    });
    return notesCopy;
}

function multiplyMatrices(m1, m2) {
    let dim = [m1.length, m2[0].length];
    let product = makeZeroMatrix(dim[0], dim[1]);
    for (r = 0; r < dim[0]; ++r) {
        for (c = 0; c < dim[1]; ++c) {
            for (i = 0; i < m1[0].length; ++i) {
                product[r][c] += m1[r][i] * m2[i][c];
            }
        }
    }
    return product;
}

function makeZeroMatrix(n0, n1) {
    m = [];
    for (i = 0; i < n0; i++) {
        row = new Array(n1).fill(0);
        m.push(row);
    }
    return m;
}

function makeIdentityMatrix(size) {
    m = makeZeroMatrix(size, size);
    for (i = 0; i < size; i++) {
        m[i][i] = 1;
    }
    return m;
}

const resetButton = document.getElementById("reset");
resetButton.addEventListener('click', function () { trainingNotes = TWINKLE_TWINKLE; }, false);

const singleButton = document.getElementById("single");
singleButton.addEventListener('click', function () { mode = 'single'; }, false);
const additiveButton = document.getElementById("additive");
additiveButton.addEventListener('click', function () { mode = 'additive'; }, false);
const AMButton = document.getElementById("am");
AMButton.addEventListener('click', function () { mode = 'am'; }, false);
const FMButton = document.getElementById("fm");
FMButton.addEventListener('click', function () { mode = 'fm'; }, false);

const sineButton = document.getElementById("sine");
sineButton.addEventListener('click', function () { waveform = 'sine'; }, false);
const sawtoothButton = document.getElementById("sawtooth");
sawtoothButton.addEventListener('click', function () { waveform = 'sawtooth'; }, false);
const squareButton = document.getElementById("square");
squareButton.addEventListener('click', function () { waveform = 'square'; }, false);
const triangleButton = document.getElementById("triangle");
triangleButton.addEventListener('click', function () { waveform = 'triangle'; }, false);

const lfoOnButton = document.getElementById("lfoOn");
lfoOnButton.addEventListener('click', function () { lfo = true; }, false);
const lfoOffButton = document.getElementById("lfoOff");
lfoOffButton.addEventListener('click', function () { lfo = false; }, false);

function playNoteSingle(note) {
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