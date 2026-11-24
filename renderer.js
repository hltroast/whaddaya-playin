const updateButton = document.getElementById('updateBtn');
const statusMessage = document.getElementById('status');

const searchBox = document.getElementById('searchBox');
const searchResults = document.getElementById('searchResults');
const selectedList = document.getElementById('selectedList');
const emptyMessage = document.getElementById('emptyMessage');
const recommendBtn = document.getElementById('recommendBtn');
const matchedGame = document.getElementById('matchedGame');
const resultsList = document.getElementById('resultsList');
const capsuleList = document.getElementById('capsuleList');
const countBox = document.getElementById('countBox');

const IMPORT_MODE = 'full';

window.api.onImportProgress(text => { statusMessage.textContent = text; });

let selectedGames = [];                                                                                 

recommendBtn.addEventListener('click', async() => {
    const count = parseInt(countBox.value, 10) || 8;
    const response = await window.api.recommend(selectedGames.map(g => g.game_id), count);
    resultsList.replaceChildren();
    capsuleList.replaceChildren();

    if (response.error) {
        matchedGame.textContent = response.error;
        return;
    }

    matchedGame.textContent = `Recommended for you:`;
    for (const game of response.results) {
        const li = document.createElement('li');
        li.textContent = `${game.name} (Match Score: ${game.match_score.toFixed(1)}) `;
        const normalized = document.createElement('strong');
        normalized.textContent = `[${game.normalized}]`;
        li.appendChild(normalized);
        resultsList.appendChild(li);

        const frame = document.createElement('div');
        frame.className = 'capsule';
        frame.title = game.name;
        const img = document.createElement('img');
        img.src = `capsule://steam/${game.game_id}`;
        img.alt = game.name;
        img.addEventListener('error', () => {img.src = 'assets/no-image.png'; }, { once: true});
        frame.appendChild(img);
        capsuleList.appendChild(frame);
    }

});

function showSelected(){
    selectedList.replaceChildren();
    for (const game of selectedGames) {
        const li = document.createElement('li');
        li.textContent = `${game.name}`
        li.addEventListener('click', () => {
            selectedGames = selectedGames.filter(g => g.game_id !== game.game_id);
            showSelected();
        });
        selectedList.appendChild(li);
    }
    emptyMessage.hidden = selectedGames.length > 0;
    recommendBtn.disabled = selectedGames.length === 0;
}

searchBox.addEventListener('input', async () => {
    const matches = await window.api.searchGames(searchBox.value);
    searchResults.replaceChildren();
    for (const game of matches) {
        const li = document.createElement('li');
        li.textContent = game.name;
        li.addEventListener('click', () => {
            if (!selectedGames.some(g => g.game_id === game.game_id)) {
                selectedGames.push(game);
            }
            searchBox.value='';
            searchResults.replaceChildren();
            showSelected();
        });
        searchResults.appendChild(li);
    }
})

updateButton.addEventListener('click', async () => {
    updateButton.disabled = true;
    const reply = await window.api.updateDatabase(IMPORT_MODE);
    statusMessage.textContent = reply;
    updateButton.disabled = false;
});

const mascot = document.getElementById('mascot');
const chantClips = ['buyin', 'sellin', 'highPrice'].map(name => new Audio(`assets/${name}.wav`));
let lastClip = -1;
mascot.addEventListener('click', () => {
    for (const clip of chantClips) { clip.pause(); clip.currentTime = 0; }
    let pick;
    do { pick = Math.floor(Math.random() * chantClips.length); } while (pick === lastClip);
    lastClip - pick;
    chantClips[pick].play();
})