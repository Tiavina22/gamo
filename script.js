// Configuration du match
let matchConfig = {
    quarterDuration: 10, // en minutes
    venue: '',
    date: '',
    shotClockDuration: 24,
    teams: {
        home: {
            name: '',
            abbrev: '',
            logo: 'placeholder-logo.png',
            turnovers: 0
        },
        visitor: {
            name: '',
            abbrev: '',
            logo: 'placeholder-logo.png',
            turnovers: 0
        }
    }
};

// Variables du match
let scores = {
    home: 0,
    visitor: 0
};
let period = 1;
let timerInterval;
let timeRemaining; // en secondes
let isTimerRunning = false;
let shotClocks = {
    home: {
        time: 24,
        interval: null,
        isRunning: false
    },
    visitor: {
        time: 24,
        interval: null,
        isRunning: false
    }
};
let currentPossession = null; // 'home' ou 'visitor'

// Fonctions de configuration
function setupChangeLogo(team) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const logoData = e.target.result;
                document.getElementById(`setup-${team}-logo`).src = logoData;
                matchConfig.teams[team].logo = logoData;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function validateSetup() {
    const homeName = document.getElementById('setup-home-name').value;
    const homeAbbrev = document.getElementById('setup-home-abbrev').value;
    const visitorName = document.getElementById('setup-visitor-name').value;
    const visitorAbbrev = document.getElementById('setup-visitor-abbrev').value;
    const venue = document.getElementById('setup-venue').value;

    if (!homeName || !homeAbbrev || !visitorName || !visitorAbbrev || !venue) {
        alert('Veuillez remplir tous les champs');
        return false;
    }
    return true;
}

function startMatch(skipValidation = false) {
    if (!skipValidation && !validateSetup()) return;

    // Sauvegarder la configuration seulement si ce n'est pas un rechargement
    if (!skipValidation) {
        matchConfig.quarterDuration = parseInt(document.getElementById('setup-quarter-duration').value);
        matchConfig.venue = document.getElementById('setup-venue').value;
        matchConfig.teams.home.name = document.getElementById('setup-home-name').value;
        matchConfig.teams.home.abbrev = document.getElementById('setup-home-abbrev').value;
        matchConfig.teams.visitor.name = document.getElementById('setup-visitor-name').value;
        matchConfig.teams.visitor.abbrev = document.getElementById('setup-visitor-abbrev').value;
        matchConfig.date = document.getElementById('setup-date').value;
    }

    // Initialiser le match
    timeRemaining = matchConfig.quarterDuration * 60;
    updateTimerDisplay();

    // Appliquer la configuration à l'écran du match
    document.getElementById('home-logo').src = matchConfig.teams.home.logo;
    document.getElementById('visitor-logo').src = matchConfig.teams.visitor.logo;
    document.getElementById('home-name').value = matchConfig.teams.home.name;
    document.getElementById('visitor-name').value = matchConfig.teams.visitor.name;
    document.getElementById('home-abbrev').textContent = matchConfig.teams.home.abbrev;
    document.getElementById('visitor-abbrev').textContent = matchConfig.teams.visitor.abbrev;
    document.getElementById('venue-display').textContent = matchConfig.venue;
    if (matchConfig.date) {
        const dateObj = new Date(matchConfig.date);
        const formattedDate = dateObj.toLocaleString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('date-display').innerHTML = `<i class="far fa-calendar-alt"></i> ${formattedDate}`;
    }

    // Basculer les écrans
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('match-screen').classList.remove('hidden');

    // Initialiser les chronomètres de possession si ce n'est pas un rechargement
    if (!skipValidation) {
        matchConfig.shotClockDuration = parseInt(document.getElementById('setup-shot-clock').value);
        shotClocks.home.time = matchConfig.shotClockDuration;
        shotClocks.visitor.time = matchConfig.shotClockDuration;
        updateShotClockDisplays();
    }

    // Initialiser les compteurs de ballons perdus
    document.getElementById('home-turnovers').textContent = matchConfig.teams.home.turnovers;
    document.getElementById('visitor-turnovers').textContent = matchConfig.teams.visitor.turnovers;

    // Sauvegarder dans le localStorage seulement si ce n'est pas un rechargement
    if (!skipValidation) {
        saveMatchState();
    }
}

// Fonctions du match
function updateScore(team, points) {
    scores[team] += points;
    if (scores[team] < 0) scores[team] = 0;
    document.getElementById(`${team}-score`).textContent = scores[team];

    // Changer automatiquement la possession après un panier
    if (points > 0) { // Seulement si c'est un panier marqué (pas pour -1)
        const newPossession = team === 'home' ? 'visitor' : 'home';
        setPossession(newPossession);
    }

    saveMatchState();
}

function changePeriod(change) {
    period += change;
    if (period < 1) period = 1;
    if (period > 4) period = 4;
    document.getElementById('period-number').textContent = period;
    timeRemaining = matchConfig.quarterDuration * 60;
    updateTimerDisplay();
    saveMatchState();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function toggleTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        document.getElementById('timer-control').textContent = '▶';

        // Mettre en pause le chronomètre de possession actif
        if (currentPossession) {
            clearInterval(shotClocks[currentPossession].interval);
            shotClocks[currentPossession].isRunning = false;
            document.getElementById(`${currentPossession}-shot-clock-btn`).textContent = '▶';
        }
    } else {
        timerInterval = setInterval(() => {
            if (timeRemaining > 0) {
                timeRemaining--;
                updateTimerDisplay();
                saveMatchState();
            } else {
                clearInterval(timerInterval);
                alert('Fin du quart-temps !');
                document.getElementById('timer-control').textContent = '▶';
                isTimerRunning = false;

                // Arrêter aussi le chronomètre de possession
                if (currentPossession) {
                    clearInterval(shotClocks[currentPossession].interval);
                    shotClocks[currentPossession].isRunning = false;
                    document.getElementById(`${currentPossession}-shot-clock-btn`).textContent = '▶';
                }

                saveMatchState();
            }
        }, 1000);
        document.getElementById('timer-control').textContent = '⏸';

        // Redémarrer le chronomètre de possession s'il était actif
        if (currentPossession && shotClocks[currentPossession].time > 0) {
            startShotClock(currentPossession);
        }
    }
    isTimerRunning = !isTimerRunning;
    saveMatchState();
}

function resetMatch() {
    if (confirm('Voulez-vous vraiment réinitialiser le match ?')) {
        scores = { home: 0, visitor: 0 };
        period = 1;
        timeRemaining = matchConfig.quarterDuration * 60;
        isTimerRunning = false;
        clearInterval(timerInterval);

        document.getElementById('home-score').textContent = '0';
        document.getElementById('visitor-score').textContent = '0';
        document.getElementById('period-number').textContent = '1';
        document.getElementById('timer-control').textContent = '▶';
        updateTimerDisplay();

        // Réinitialiser les chronomètres de possession
        Object.keys(shotClocks).forEach(team => {
            clearInterval(shotClocks[team].interval);
            shotClocks[team].time = matchConfig.shotClockDuration;
            shotClocks[team].isRunning = false;
            document.getElementById(`${team}-shot-clock-btn`).textContent = '▶';
            document.getElementById(`${team}-shot-clock`).classList.remove('warning');
            updateShotClockDisplay(team);
        });

        // Réinitialiser les ballons perdus
        matchConfig.teams.home.turnovers = 0;
        matchConfig.teams.visitor.turnovers = 0;
        document.getElementById('home-turnovers').textContent = '0';
        document.getElementById('visitor-turnovers').textContent = '0';

        // Réinitialiser la possession
        setPossession(null);

        saveMatchState();
    }
}

function returnToSetup() {
    if (confirm('Voulez-vous retourner à la configuration ? Les données du match actuel seront perdues.')) {
        localStorage.clear();
        location.reload();
    }
}

function saveMatchState() {
    const matchState = {
        config: matchConfig,
        scores: scores,
        period: period,
        timeRemaining: timeRemaining,
        shotClocks: {
            home: {
                time: shotClocks.home.time,
                isRunning: shotClocks.home.isRunning
            },
            visitor: {
                time: shotClocks.visitor.time,
                isRunning: shotClocks.visitor.isRunning
            }
        },
        possession: currentPossession,
        isTimerRunning: isTimerRunning
    };
    localStorage.setItem('basketballMatch', JSON.stringify(matchState));
}

// Charger l'état du match au démarrage
document.addEventListener('DOMContentLoaded', () => {
    const savedState = localStorage.getItem('basketballMatch');
    if (savedState) {
        const state = JSON.parse(savedState);

        // Restaurer la configuration et les scores
        matchConfig = state.config;
        scores = state.scores;
        period = state.period;
        timeRemaining = state.timeRemaining;
        isTimerRunning = state.isTimerRunning;

        // Restaurer les chronomètres de possession
        if (state.shotClocks) {
            shotClocks.home.time = state.shotClocks.home.time;
            shotClocks.visitor.time = state.shotClocks.visitor.time;
        }

        // Passer directement à l'écran du match avec skipValidation = true
        startMatch(true);

        // Mettre à jour tous les affichages
        document.getElementById('home-score').textContent = scores.home;
        document.getElementById('visitor-score').textContent = scores.visitor;
        document.getElementById('period-number').textContent = period;
        updateTimerDisplay();
        updateShotClockDisplays();

        // Restaurer la possession
        if (state.possession) {
            currentPossession = state.possession;
            document.getElementById(`${state.possession}-possession`).classList.add('active');
        }

        // Redémarrer les chronomètres qui étaient en cours
        if (state.shotClocks.home.isRunning) {
            startShotClock('home');
        }
        if (state.shotClocks.visitor.isRunning) {
            startShotClock('visitor');
        }

        // Restaurer le chronomètre principal
        if (state.isTimerRunning) {
            setTimeout(() => {
                toggleTimer();
            }, 500);
        }

        // Restaurer les états des boutons
        if (shotClocks.home.isRunning) {
            document.getElementById('home-shot-clock-btn').textContent = '⏸';
        }
        if (shotClocks.visitor.isRunning) {
            document.getElementById('visitor-shot-clock-btn').textContent = '⏸';
        }
        if (isTimerRunning) {
            document.getElementById('timer-control').textContent = '⏸';
        }
    }

    // Si pas d'état sauvegardé, initialiser la date à maintenant
    if (!localStorage.getItem('basketballMatch')) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('setup-date').value = now.toISOString().slice(0, 16);
    }
});

function toggleShotClock(team) {
    // Si on démarre un chronomètre, arrêter l'autre s'il est en cours
    if (!shotClocks[team].isRunning) {
        const otherTeam = team === 'home' ? 'visitor' : 'home';
        if (shotClocks[otherTeam].isRunning) {
            clearInterval(shotClocks[otherTeam].interval);
            shotClocks[otherTeam].isRunning = false;
            document.getElementById(`${otherTeam}-shot-clock-btn`).textContent = '▶';
        }
    }

    if (shotClocks[team].isRunning) {
        clearInterval(shotClocks[team].interval);
        document.getElementById(`${team}-shot-clock-btn`).textContent = '▶';
    } else {
        startShotClock(team);
    }
    shotClocks[team].isRunning = !shotClocks[team].isRunning;
}

// Nouvelle fonction pour démarrer le chronomètre
function startShotClock(team) {
    // Ne pas démarrer le chronomètre de possession si le chronomètre principal est arrêté
    if (!isTimerRunning) {
        alert('Le chronomètre principal doit être en marche pour démarrer la possession');
        return;
    }

    shotClocks[team].interval = setInterval(() => {
        if (shotClocks[team].time > 0) {
            shotClocks[team].time--;
            updateShotClockDisplay(team);
            saveMatchState();

            if (shotClocks[team].time <= 5) {
                document.getElementById(`${team}-shot-clock`).classList.add('warning');
            }
        } else {
            clearInterval(shotClocks[team].interval);
            document.getElementById(`${team}-shot-clock-btn`).textContent = '▶';
            shotClocks[team].isRunning = false;

            playBuzzer();

            const otherTeam = team === 'home' ? 'visitor' : 'home';
            setPossession(otherTeam);

            saveMatchState();
        }
    }, 1000);
    document.getElementById(`${team}-shot-clock-btn`).textContent = '⏸';
    shotClocks[team].isRunning = true;
    saveMatchState();
}

function resetShotClock(team) {
    shotClocks[team].time = matchConfig.shotClockDuration;
    document.getElementById(`${team}-shot-clock`).classList.remove('warning');
    updateShotClockDisplay(team);
}

function updateShotClockDisplay(team) {
    document.getElementById(`${team}-shot-clock`).textContent = shotClocks[team].time;
}

function updateShotClockDisplays() {
    updateShotClockDisplay('home');
    updateShotClockDisplay('visitor');
}

function updateTurnovers(team, change) {
    matchConfig.teams[team].turnovers = Math.max(0, matchConfig.teams[team].turnovers + change);
    document.getElementById(`${team}-turnovers`).textContent = matchConfig.teams[team].turnovers;
    saveMatchState();
}

// Ajouter un son pour la fin du chronomètre de possession
function playBuzzer() {
    const audio = new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
    audio.play();
}

// Ajouter cette fonction pour gérer la possession
function setPossession(team) {
    // Arrêter et réinitialiser l'ancien chronomètre de possession
    if (currentPossession) {
        clearInterval(shotClocks[currentPossession].interval);
        shotClocks[currentPossession].isRunning = false;
        shotClocks[currentPossession].time = matchConfig.shotClockDuration;
        document.getElementById(`${currentPossession}-shot-clock-btn`).textContent = '▶';
        document.getElementById(`${currentPossession}-shot-clock`).classList.remove('warning');
        updateShotClockDisplay(currentPossession);
    }

    // Mettre à jour l'indicateur visuel
    document.getElementById('home-possession').classList.remove('active');
    document.getElementById('visitor-possession').classList.remove('active');

    if (team) {
        document.getElementById(`${team}-possession`).classList.add('active');

        // Réinitialiser et démarrer le chronomètre de possession seulement si le chronomètre principal est en marche
        resetShotClock(team);
        if (isTimerRunning) {
            startShotClock(team);
            shotClocks[team].isRunning = true;
        }
    }

    currentPossession = team;
    saveMatchState();
}

// Ajouter l'écouteur d'événements pour les touches
document.addEventListener('keydown', (e) => {
    if (e.key === '1') {
        setPossession('home');
    } else if (e.key === '2') {
        setPossession('visitor');
    }
});

// Ajouter ces fonctions pour la navigation entre les étapes
function nextStep(currentStep) {
    if (validateStep(currentStep)) {
        document.getElementById(`step-${currentStep}`).classList.add('hidden');
        document.getElementById(`step-${currentStep + 1}`).classList.remove('hidden');
        updateProgress(currentStep + 1);
        if (currentStep === 2) {
            updateSummary();
        }
    }
}

function prevStep(currentStep) {
    document.getElementById(`step-${currentStep}`).classList.add('hidden');
    document.getElementById(`step-${currentStep - 1}`).classList.remove('hidden');
    updateProgress(currentStep - 1);
}

function updateProgress(step) {
    document.querySelectorAll('.progress-step').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-step="${step}"]`).classList.add('active');
}

function validateStep(step) {
    switch (step) {
        case 1:
            const homeName = document.getElementById('setup-home-name').value;
            const homeAbbrev = document.getElementById('setup-home-abbrev').value;
            const visitorName = document.getElementById('setup-visitor-name').value;
            const visitorAbbrev = document.getElementById('setup-visitor-abbrev').value;

            if (!homeName || !homeAbbrev || !visitorName || !visitorAbbrev) {
                alert('Veuillez remplir tous les champs des équipes');
                return false;
            }

            //Check if the names of the registered teams are different
            if (homeName.toLowerCase() == visitorName.toLowerCase()) {
                alert("Les noms des équipes ne peuvent pas être identiques.");
                return false;
            }

            //Check if the abbreavition of the registered teams are different
            if (homeAbbrev.toLowerCase() == visitorAbbrev.toLowerCase()) {
                alert("Les abreavions des noms des équipes ne peuvent pas être identiques.");
                return false;
            }


            return true;

        case 2:
            const venue = document.getElementById('setup-venue').value;
            const date = document.getElementById('setup-date').value;
            if (!venue || !date) {
                alert('Veuillez remplir tous les champs (stade et date)');
                return false;
            }
            return true;

        default:
            return true;
    }
}

function updateSummary() {
    // Mettre à jour les informations du résumé
    document.getElementById('summary-home-name').textContent = document.getElementById('setup-home-name').value;
    document.getElementById('summary-home-abbrev').textContent = document.getElementById('setup-home-abbrev').value;
    document.getElementById('summary-visitor-name').textContent = document.getElementById('setup-visitor-name').value;
    document.getElementById('summary-visitor-abbrev').textContent = document.getElementById('setup-visitor-abbrev').value;
    document.getElementById('summary-venue').textContent = document.getElementById('setup-venue').value;
    document.getElementById('summary-quarter').textContent = document.getElementById('setup-quarter-duration').value;
    document.getElementById('summary-shot-clock').textContent = document.getElementById('setup-shot-clock').value;

    // Mettre à jour les logos
    document.getElementById('summary-home-logo').src = document.getElementById('setup-home-logo').src;
    document.getElementById('summary-visitor-logo').src = document.getElementById('setup-visitor-logo').src;

    // Formater et afficher la date dans le résumé
    const dateValue = document.getElementById('setup-date').value;
    if (dateValue) {
        const dateObj = new Date(dateValue);
        const formattedDate = dateObj.toLocaleString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('summary-date').textContent = formattedDate;
    }
}