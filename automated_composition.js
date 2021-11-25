var audioCtx;
var osc;
var gainNode;

var states;
var markovChain_order1;
var markovChain;
var order = 1;

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
const SEQUENCE_LENGTH = 15;
const NOTE_LENGTH = 1;

const playButton = document.getElementById("play");
playButton.addEventListener('click', function () {
    setupWebAudio();
    makeMarkovChain(trainingNotes);
    let noteList = genNotes(trainingNotes);
    playNotes(noteList);
}, false);

const resetButton = document.getElementById("reset");
resetButton.addEventListener('click', function () { trainingNotes = TWINKLE_TWINKLE; }, false);

function playNotes(noteList) {
    noteList.notes.forEach(note => {
        playNote(note);
    });
}

function genNotes(noteList) {
    let newNotes = copyNoteList(noteList);
    for (i = newNotes.notes.length; i < newNotes.notes.length + SEQUENCE_LENGTH; i++) {
        const newNoteCopy = newNote(newNotes);
        newNotes.notes.push(newNoteCopy);
        newNotes.totalTime = newNoteCopy.endTime;
    }
    return noteList;
}

function makeMarkovChain(noteList) {
    getStates(noteList);
    makeMarkovChainOrder1(noteList);
    makeMarkovChainOrderN();
}

function setupWebAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    osc = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start()
    gainNode.gain.value = 0;
}

function playNote(note) {
    gainNode.gain.setTargetAtTime(1, note.startTime, 0.01);
    osc.frequency.setTargetAtTime(midiToFreq(note.pitch), note.startTime, 0.001);
    gainNode.gain.setTargetAtTime(0, note.endTime, 0.01);
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
    let newNote = copyNote(noteList, i);
    newNote.pitch = getNextNote(newNote.pitch);
    newNote.startTime = newNote.endTime;
    newNote.endTime = newNote.startTime + NOTE_LENGTH;
    return newNote;
}

function getNextNote(pitch) {
    randomNote = Math.random();
    note = 0;
    for (prob = 0; prob + markovChain[states[pitch]] < randomNote; prob += markovChain[states[pitch]]) {
        note++;
    }
    return parseInt(Object.keys(states)[note]);
}

function copyNoteList(noteList) {
    let notesCopy = { notes: [], totalTime: 0 };
    noteList.notes.forEach(note => {
        notesCopy.notes.push(note);
        notesCopy.totalTime = note.endTime;
    });
    return notesCopy;
}

function copyNote(noteList, i) {
    let noteCopy = JSON.parse(JSON.stringify(noteList.notes[i - 1]));
    return noteCopy;
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

function updateOrder(value) { order = value; };
function updateTrainingNotes(value) { trainingNotes = blobToNoteSequence(value); }
function midiToFreq(m) { return Math.pow(2, (m - 69) / 12) * 440; }