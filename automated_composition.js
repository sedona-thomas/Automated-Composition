var audioCtx;
var states;
var markovChain_order1;
var markovChain;
var order = 0;

function updateOrder(value) { order = value; };

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

    markovChain_order1 = [];

    

    makeMarkovChainWithOrder();
}

function makeMarkovChainWithOrder() {
    markovChain = math.identity(states.length);
    for (i = 0; i < order; i++) {
        markovChain = math.multiply(markovChain, markovChain_order1);
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

function genNotes() {

}

const playButton = document.getElementById("play");
playButton.addEventListener('click', function () {
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    makeMarkovChain(TWINKLE_TWINKLE);
    genNotes();
}, false);