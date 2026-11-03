const button = document.getElementById('updateBtn');
const statusMessage = document.getElementById('status');

const searchBox = document.getElementById('searchBox');
const recommendBtn = document.getElementById('recommendBtn');
const matchedGame = document.getElementById('matchedGame');
const resultsList = document.getElementById('resultsList');

recommendBtn.addEventListener('click', async() => {
    const response = await window.api.recommend(searchBox.value);
    resultsList.replaceChildren();

    if (response.error) {
        matchedGame.textContent = response.error;
        return;
    }

    matchedGame.textContent = `Games most similar to "${response.input.name}":`;
    for (const game of response.results) {
        const li = document.createElement('li');
        li.textContent = `${game.name} (Match Score: ${game.match_score})`;
        resultsList.appendChild(li);
    }

});

button.addEventListener('click', async () => {
    const reply = await window.api.updateDatabase();
    statusMessage.textContent = reply;
});