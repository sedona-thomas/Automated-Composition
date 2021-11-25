const trainingNotes = TWINKLE_TWINKLE;
var audioCtx;
var states;
var markovChain_order1;
var markovChain;
var order = 1;

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

function makeMarkovChain(noteList) {
    getStates(noteList);
    makeMarkovChainOrder1(noteList);
    makeMarkovChainOrderN();
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

    let noteSet = [];
    noteList.notes.forEach(note => {
        if (!noteSet.contains(note)) {
            noteSet.push(note.pitch);
        }
    });
    noteSet.sort();

    let i = 0;
    noteSet.forEach(note => {
        states[note] = i;
        i++;
    });
}

function getNGramCounts(noteList) {
    unigram_counts = math.zeros(states.length);
    bigram_counts = math.zeros(states.length, states.length);
    i = 0;
    for (; i < states.length - 1; i++) {
        curr_note = states[noteList.notes[i]];
        next_note = states[noteList.notes[i + 1]];
        unigram_counts[curr_note]++;
        bigram_counts[curr_note][next_note]++;
    }
    curr_note = states[noteList.notes[i]];
    unigram_counts[curr_note]++;
    return [unigram: unigram_counts, bigram: bigram_counts]
}

function genNotes() {

}

const playButton = document.getElementById("play");
playButton.addEventListener('click', function () {
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    makeMarkovChain(trainingNotes);
    genNotes();
}, false);