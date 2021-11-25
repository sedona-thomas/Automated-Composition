var audioCtx;
var osc;
var gainNode;

var states;
var markovChain_order1;
var markovChain;
var order = 1;

var trainingNotes = TWINKLE_TWINKLE;
const SEQUENCE_LENGTH = newNotes.length;
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
    noteList.forEach(note => {
        playNote(note);
    });
}

function genNotes(noteList) {
    let newNotes = copyNoteList(noteList);

    for (let i = newNotes.length; i < newNotes.length + SEQUENCE_LENGTH; i++) {
        let newNote = copyNote(newNotes, i);
        newNote.pitch = getNextNote(newNote.pitch);
        newNote.startTime = newNote.endTime;
        newNote.endTime = newNote.startTime + NOTE_LENGTH;
        const newNoteCopy = newNote;
        noteList.push(newNoteCopy);
    }

    console.log(newNotes);
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
    gainNode.gain.setTargetAtTime(1, note.startTime, 0.01)
    osc.frequency.setTargetAtTime(midiToFreq(note.pitch), note.startTime, 0.001)
    gainNode.gain.setTargetAtTime(0, note.endTime, 0.01)

}

function makeMarkovChainOrderN() {
    markovChain = math.identity(states.length);
    for (i = 0; i < order; i++) {
        markovChain = math.multiply(markovChain, markovChain_order1);
    }
}

function makeMarkovChainOrder1() {
    markovChain_order1 = [];
    counts = getNGramCounts(noteList);
    for (i = 0; i < states.length - 1; i++) {
        for (j = 0; j < states.length - 1; j++) {
            markovChain_order1[i][j] = counts.bigram[i][j] / counts.unigram[i];
        }
    }
}

function getStates(noteList) {
    states = {};

    let pitchSet = [];
    noteList.notes.forEach(note => {
        if (!pitchSet.contains(note)) {
            pitchSet.push(note.pitch);
        }
    });
    pitchSet.sort();

    let i = 0;
    pitchSet.forEach(pitch => {
        states[pitch] = i;
        i++;
    });
}

function getNGramCounts(noteList) {
    unigram_counts = math.zeros(states.length);
    bigram_counts = math.zeros(states.length, states.length);
    i = 0;
    for (; i < states.length - 1; i++) {
        curr_note = states[noteList.notes[i].pitch];
        next_note = states[noteList.notes[i + 1].pitch];
        unigram_counts[curr_note]++;
        bigram_counts[curr_note][next_note]++;
    }
    curr_note = states[noteList.notes[i].pitch];
    unigram_counts[curr_note]++;
    return [unigram: unigram_counts, bigram: bigram_counts]
}

function getNextNote(pitch) {
    randomNote = Math.random();
    probSum = 0;
    currNote = 0;
    while (probSum + markovChain[states[pitch]] < randomNote) {
        probSum += markovChain[states[pitch]];
        currNote++;
    }
    return Object.keys(states)[currNote];
}

function copyNoteList(noteList) {
    let notesCopy = [];
    noteList.forEach(note => {
        console.log(note);
        notesCopy.push(note);
    });
    return notesCopy;
}

function copyNote(noteList, i) {
    let noteCopy = JSON.parse(JSON.stringify(noteList[i - 1]));
    console.log(noteCopy);
    return notecopy;
}

function midiToFreq(m) { return Math.pow(2, (m - 69) / 12) * 440; }

function updateOrder(value) { order = value; };
function updateTrainingNotes(value) { trainingNotes = blobToNoteSequence(value); }

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