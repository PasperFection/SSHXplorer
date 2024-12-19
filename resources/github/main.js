// Acquire VS Code API
const vscode = acquireVsCodeApi();

// Store state
let state = {
    repositories: []
};

// Initialize
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'updateRepository':
            updateRepositoryList(message.repository);
            break;
    }
});

function cloneRepo() {
    vscode.postMessage({ type: 'clone' });
}

function createPR() {
    vscode.postMessage({ type: 'createPR' });
}

function viewIssues() {
    vscode.postMessage({ type: 'viewIssues' });
}

function updateRepositoryList(repository) {
    const repoList = document.getElementById('repoList');
    
    // Add to state
    state.repositories.unshift(repository);
    if (state.repositories.length > 5) {
        state.repositories.pop();
    }
    
    // Update UI
    const repoElements = state.repositories.map(repo => `
        <div class="repo-item" onclick="selectRepository('${repo.fullName}')">
            <div class="repo-name">
                ${repo.name}
                <span class="status-badge ${repo.private ? 'pending' : 'success'}">
                    ${repo.private ? 'Private' : 'Public'}
                </span>
            </div>
            <div class="repo-description">${repo.description || 'No description'}</div>
        </div>
    `).join('');
    
    const repoSection = document.createElement('div');
    repoSection.innerHTML = `
        <h2>Recent Repositories</h2>
        ${repoElements}
    `;
    
    repoList.innerHTML = '';
    repoList.appendChild(repoSection);
}

function selectRepository(fullName) {
    vscode.postMessage({
        type: 'selectRepository',
        repository: fullName
    });
}
