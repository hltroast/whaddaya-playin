const updateButton = document.getElementById('updateBtn');
const statusMessage = document.getElementById('status');

const searchBox = document.getElementById('searchBox');
const searchResults = document.getElementById('searchResults');
const selectedList = document.getElementById('selectedList');
const emptyMessage = document.getElementById('emptyMessage');
const recommendBtn = document.getElementById('recommendBtn');
const matchedGame = document.getElementById('matchedGame');
const resultsList = document.getElementById('resultsList');

let selectedGames = [];                                                                                 

recommendBtn.addEventListener('click', async() => {
    const response = await window.api.recommend(selectedGames.map(g => g.game_id));
    resultsList.replaceChildren();

    if (response.error) {
        matchedGame.textContent = response.error;
        return;
    }

    matchedGame.textContent = `Recommended for you:`;
    for (const game of response.results) {
        const li = document.createElement('li');
        li.textContent = `${game.name} (Match Score: ${game.match_score.toFixed(1)})`;
        resultsList.appendChild(li);
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
    const reply = await window.api.updateDatabase();
    statusMessage.textContent = reply;
});