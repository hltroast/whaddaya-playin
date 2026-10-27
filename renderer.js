const button = document.getElementById('updateBtn');
const statusMessage = document.getElementById('status');

button.addEventListener('click', async () => {
    const reply = await window.api.updateDatabase();
    statusMessage.textContent = reply;
});