class Player {
    //difficulty is "player" "neutral" or easy/medium/hard
    constructor(num, difficulty, startingCell, startingUnits) {
        this.num = num;
        this.difficulty = difficulty;
        this.startingCell = startingCell;
        this.startingUnits = startingUnits;
    }

    //set home base cell up after grid is initialized
    setup() {
        if(!grid.length) {
            console.log('Attempted to initialize a player while grid is empty.');
            return;
        } else if(this.difficulty === "neutral") {
            return;
        }
        grid[this.startingCell.x][this.startingCell.y].setToPlayer(this.num);
        grid[this.startingCell.x][this.startingCell.y].units = 0;
        grid[this.startingCell.x][this.startingCell.y].addUnits(this.startingUnits);

        grid[this.startingCell.x][this.startingCell.y].outer = true;
        grid[this.startingCell.x][this.startingCell.y].neighbors.forEach(neighbor => {
            neighbor.outer = true;
        });
    }

    //returns a newly set interval containing AI logic based on difficulty
    getAILogic() {
        if(this.difficulty === "hard") {
            return null;
        } else if(this.difficulty === "medium") {
            return null;
        } else if(this.difficulty === "easy") {
            return setInterval(()=>{
                //immediately abort each iteration if player is already dead - TODO if we end up disposing the timer entirely, then this check doesn't need to be present
                if(playerCells[this.num].length == 0) { return; }

                const possiblePlayerAttacks = [];
                const possibleNeutralAttacks = [];
                let mostNeededTroops = { found:false, againstPlayer:false, num:0, x:-1, y:-1 };

                //go through all OUTER cells and store all possible attacks and which needs reinforcements the most
                for(let i = 0; i < playerCells[this.num].length; i++) {
                    const currentCell = playerCells[this.num][i];
                    if(currentCell.outer) {
                        currentCell.neighbors.forEach(neighbor => {
                            if(neighbor.controllingPlayer !== currentCell.controllingPlayer && neighbor.controllingPlayer !== 0) {
                                //this neighbor is an enemy player
                                if(neighbor.units < currentCell.units) {
                                    possiblePlayerAttacks.push({ myX:currentCell.x, myY:currentCell.y, theirX:neighbor.x, theirY:neighbor.y });
                                } else {
                                    if(!mostNeededTroops.found || (!mostNeededTroops.againstPlayer || mostNeededTroops.num < neighbor.units - currentCell.units)) {
                                        mostNeededTroops = { found:true, againstPlayer:true, num:neighbor.units - currentCell.units, x:currentCell.x, y:currentCell.y };
                                    }
                                }
                            } else if(neighbor.controllingPlayer !== currentCell.controllingPlayer) {
                                //this neighbor is neutral
                                if(neighbor.units < currentCell.units) {
                                    possibleNeutralAttacks.push({ myX:currentCell.x, myY:currentCell.y, theirX:neighbor.x, theirY:neighbor.y });
                                } else {
                                    if(!mostNeededTroops.found || (!mostNeededTroops.againstPlayer && mostNeededTroops.num < neighbor.units - currentCell.units)) { 
                                        mostNeededTroops = { found:true, againstPlayer:false, num:neighbor.units - currentCell.units, x:currentCell.x, y:currentCell.y };
                                    }
                                }
                            }
                        });
                    }
                }

                //do player attack if there is one, neutral attack, or if none move some troops from an inner cell
                if(possiblePlayerAttacks.length > 0) {
                    let attack = possiblePlayerAttacks[Math.floor(Math.random() * possiblePlayerAttacks.length)];
                    grid[attack.theirX][attack.theirY].getAttacked(grid[attack.myX][attack.myY]);
                } else if(possibleNeutralAttacks.length > 0) {
                    let attack = possibleNeutralAttacks[Math.floor(Math.random() * possiblePlayerAttacks.length)];
                    grid[attack.theirX][attack.theirY].getAttacked(grid[attack.myX][attack.myY]);
                } else if(mostNeededTroops.found) {
                    let index = -1;
                    let max = -1;
                    for(let i = 0; i < playerCells[this.num].length; i++) {
                        if(!playerCells[this.num][i].outer) {
                            let count = playerCells[this.num][i].units;
                            if(count > max) {
                                max = count;
                                index = i;
                            }
                        }
                    }
                    if(index >= 0) {
                        grid[mostNeededTroops.x][mostNeededTroops.y].getUnitsFrom(playerCells[this.num][index], Math.ceil(playerCells[this.num][index].units / 2));
                    }
                }
                
            },1500 + Math.floor(Math.random() * 1000));
        } else {
            return null;
        }
    }
}

//TODO return this to constant, leaving as let for easy changing of player control in console while testing
let playerNum = 1;

let gameRunning = false;
let spawnTimer;
let AITimers = [];
let grid = [];

const maxPerCell = 999;
let dimension = 15;
const relativeStartingCells = [{x:1,y:1},{x:-1,y:1},{x:1,y:-1},{x:-1,y:-1}];
let startingCells = [];
let randomizeStartingLocations = true;
let startingUnits = 30;
let initialSpawnRanges = [{min:10,max:40},{min:20,max:50},{min:30,max:80},{min:50,max:125},{min:75,max:150},{min:100,max:250}]; //longest range is theoretically d-2 for d is even, d-1 for d is odd
let symmetry = true;

let spawnRanges = initialSpawnRanges.map(val => val);

function InitializeStartingCells() {
    startingCells = relativeStartingCells.map(relativePosition => {
        let x = 0;
        if(relativePosition.x > 0 && relativePosition.x <= dimension) {
            x = relativePosition.x - 1;
        } else if(relativePosition.x < 0 && relativePosition.x >= dimension * -1) {
            x = dimension + relativePosition.x;
        } else {
            throw new Error('Relative starting position \'x\' invalid.');
        }

        let y = 0;
        if(relativePosition.y > 0 && relativePosition.y <= dimension) {
            y = relativePosition.y - 1;
        } else if(relativePosition.y < 0 && relativePosition.y >= dimension * -1) {
            y = dimension + relativePosition.y;
        } else {
            throw new Error('Relative starting position \'y\' invalid.');
        }

        return {x,y};
    });
}

let selectingCell = null;
let attackableCells = [];
let movableCells = [];
let players = [];
let playerCells = [[]];

class Cell {
    constructor(domCell, controllingPlayer, x, y) {
        this.domCell = domCell;
        this.setToPlayer(controllingPlayer);
        this.x = x;
        this.y = y;
        this.spawnRate = 5;

        this.outer = false;

        this.neighbors = [];

        this.units = 0;
        this.domCell.onclick = e => {
            if(!gameRunning) { return; }

            //run block if we are clicking a cell while already having selected one
            if(selectingCell) {
                //if clicking the same one as selected, stop selecting
                if(this === selectingCell) {
                    StopSelecting();
                    return;
                }

                //if targeting an attackable cell, resolve attack
                if(attackableCells.includes(this) && selectingCell.controllingPlayer !== this.controllingPlayer) {
                    this.getAttacked(selectingCell);
                }

                //handle move units
                if(movableCells.includes(this) && selectingCell.controllingPlayer === this.controllingPlayer) {
                    let moveUnits = Math.ceil(selectingCell.units / 2);
                    this.getUnitsFrom(selectingCell, moveUnits);
                }

                //end selection now that we've done an action
                StopSelecting();
                return;
            }

            //reset all select data just in case
            StopSelecting();

            //set currently selected cell if player owns it, otherwise bail
            if(this.controllingPlayer === playerNum) {
                selectingCell = this;
                this.domCell.classList.add('selected');
            } else {
                return;
            }

            //set cells that can be attacked to left/right/up/down cells that are a different player than this one
            this.neighbors.forEach(neighbor => {
                if(neighbor.controllingPlayer != this.controllingPlayer) {
                    neighbor.domCell.classList.add('attackable');
                    attackableCells.push(neighbor);
                }
            });

            //recursive function to crawl from current spot to find all ATTACHED friendly cells
            const addConnectedNeighbors = (X,Y) => {
                //for each direction, if that cell exists AND is friendly AND is not already in movableCells, add it AND its neighbors
                grid[X][Y].neighbors.forEach(neighbor => {
                    if(neighbor.controllingPlayer === this.controllingPlayer && !movableCells.includes(neighbor)) {
                        neighbor.domCell.classList.add('movable');
                        movableCells.push(neighbor);
                        addConnectedNeighbors(neighbor.x,neighbor.y);
                    }
                });
            };

            //call recursive crawl starting at this spot
            addConnectedNeighbors(this.x, this.y);

            //find this cell in movableCells and remove it - it should have been added in recursion unless there are no connections
            const ind = movableCells.indexOf(this);
            this.domCell.classList.remove('movable');
            if(ind >= 0) { movableCells.splice(ind,1); }
        };
    }

    initializeNeighbors() {
        this.neighbors = [];
        if(grid[this.x+1] && grid[this.x+1][this.y]) { this.neighbors.push(grid[this.x+1][this.y]); }
        if(grid[this.x-1] && grid[this.x-1][this.y]) { this.neighbors.push(grid[this.x-1][this.y]); }
        if(grid[this.x][this.y+1]) { this.neighbors.push(grid[this.x][this.y+1]); }
        if(grid[this.x][this.y-1]) { this.neighbors.push(grid[this.x][this.y-1]); }
    }

    updateOuterness() {
        this.outer = false;
        this.neighbors.forEach(neighbor => {
            if(neighbor.controllingPlayer != this.controllingPlayer) {
                this.outer = true;
            }
        });
    }

    spawn() {
        this.addUnits(this.spawnRate);
    }

    setToPlayer(num) {
        if(num < 0 || num > 4 || this.controllingPlayer === num) { return; }

        //if we are currently selecting this cell we need to deselect it
        if(selectingCell == this) {
            StopSelecting();
        }

        //clear any other player number class that might be set
        this.domCell.classList.remove('player0cell');
        this.domCell.classList.remove('player1cell');
        this.domCell.classList.remove('player2cell');
        this.domCell.classList.remove('player3cell');
        this.domCell.classList.remove('player4cell');

        //move this from one players cell array to the other
        if(playerCells[this.controllingPlayer]) {
            let ind = playerCells[this.controllingPlayer].indexOf(this);
            if(ind >= 0) { playerCells[this.controllingPlayer].splice(ind,1); }
        }
        playerCells[num].push(this);

        this.controllingPlayer = num;
        this.domCell.classList.add('player' + num + 'cell');

        //IF game is running, check if game is over and update outerness
        if(gameRunning) {
            //check number of living players to see if game is over
            let livingPlayers = 0;
            let lastPlayer = 0;
            for(let i = 1; i < playerCells.length; i++) {
                if(playerCells[i].length > 0) {
                    ++livingPlayers;
                    lastPlayer = i;
                }
            }
            if(livingPlayers === 0) {
                console.log('No players alive?!?');
                EndGame();
                return;
            } else if(livingPlayers === 1) {
                EndGame(lastPlayer);
                return;
            }

            //update outerness of this cell and its neighbors
            this.updateOuterness();
            this.neighbors.forEach(neighbor => {
                neighbor.updateOuterness();
            });
        }
    }

    getAttacked(byCell) {
        if(this.units > byCell.units) {
            this.units -= byCell.units;
            byCell.units = 0;
        } else if(this.units == byCell.units) {
            this.units = 0;
            byCell.units = 0;
        } else {
            let totalUnits = byCell.units - this.units;
            byCell.units = Math.floor(totalUnits / 2);
            this.units = totalUnits - byCell.units;
            this.setToPlayer(byCell.controllingPlayer);
        }
        this.updateRender();
        byCell.updateRender();
    }

    getUnitsFrom(sourceCell, num) {
        if(num > sourceCell.units) { num = sourceCell.units; }
        if(num > maxPerCell - this.units) { num = maxPerCell - this.units; }
        if(num <= 0) { return; }
        if(sourceCell.units > 0) {
            this.addUnits(num);
            sourceCell.units -= num;
        }
        this.updateRender();
        sourceCell.updateRender();
    }

    addUnits(num) {
        this.units += num;
        if(this.units > maxPerCell) { this.units = maxPerCell; }
        this.updateRender();
    }

    updateRender() {
        this.domCell.textContent = this.units;
    }
}

//loads grid and starts game
function StartGame() {
    //Click anywhere on page leaves selecting mode
    document.querySelector('body').onclick += e => { StopSelecting(); }

    document.querySelector('#pausebutton').style.display = "initial";

    InitializeStartingCells();

    //create player objects based on info
    if(randomizeStartingLocations) { ShuffleStartingCells(); }
    function ShuffleStartingCells() {
        let rv = [];
        while(startingCells.length > 0) {
            const ind = Math.floor(Math.random() * startingCells.length);
            rv.push(startingCells[ind]);
            startingCells.splice(ind, 1);
        }
        startingCells = rv;
    }
    players = [new Player(0, "neutral", null, null)];
    for(let i = 0; i < startingCells.length; i++) {
        let diff = 'easy';
        if(playerNum === i+1) {
            diff = 'player';
        }
        players.push(new Player(i+1, diff, startingCells[i], startingUnits));
    };

    //initialize arrays of each player's cells
    playerCells = [[]];
    for(let i = 0; i < startingCells.length; i++) { playerCells.push([]); }

    //new grid
    grid = [];
    for(let i = 0; i < dimension; i++) { grid.push([]); }

    const table = document.createElement('table');
    for(let i = 0; i < dimension; i++) {
        const row = document.createElement('tr');
        for(let j = 0; j < dimension; j++) {
            const cell = document.createElement('td');
            grid[j].push(new Cell(cell, 0, j, i));
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    document.querySelector('#gamearea').appendChild(table);

    //go through grid and initialize neighbors + spawn units
    grid.forEach(arr => {
        arr.forEach(cell => {
            cell.initializeNeighbors();

            //this may have already been assigned by a symmetry assignment - in that case, bail
            if(cell.units > 0) {
                return;
            }

            //figure out distance to nearest player cell
            let minDist = spawnRanges.length;
            players.forEach(player => {
                if(player.difficulty !== "neutral") {
                    const dist = Math.abs(player.startingCell.x - cell.x) + Math.abs(player.startingCell.y - cell.y);
                    if(dist < minDist) { minDist = dist; }
                }
            });

            //initialize neutrals based on that
            if(minDist > 0) {
                const range = spawnRanges[minDist - 1];
                cell.units = 0;
                cell.addUnits(range.min + Math.floor(Math.random() * ((range.max - range.min) + 1)));
            }

            //mirror the number if symmetry
            if(symmetry && minDist > 0) {
                const X1 = dimension - (cell.x + 1);
                const Y1 = dimension - (cell.y + 1);
                const X2 = dimension - (cell.y + 1);
                const Y2 = cell.x;
                const X3 = dimension - (X2 + 1);
                const Y3 = dimension - (Y2 + 1);
                if(X1 != cell.x || Y1 != cell.y) {
                    grid[X1][Y1].units = 0;
                    grid[X1][Y1].addUnits(cell.units);
                    grid[X2][Y2].units = 0;
                    grid[X2][Y2].addUnits(cell.units);
                    grid[X3][Y3].units = 0;
                    grid[X3][Y3].addUnits(cell.units);
                }
            }
        });
    });

    //initialize player starts
    players.forEach(player => {
        player.setup();
    });

    //spawn timer for new units
    StartSpawning();

    //AI logic
    //set off each player's timer and store them
    players.forEach(player => {
        const timer = player.getAILogic();
        if(timer) {
            AITimers.push(timer);
        }
    });

    gameRunning = true;
}

function GameStartFormSubmit(e) {
    e.preventDefault();
    dimension = Number(e.target.elements.dimension.value);
    randomizeStartingLocations = e.target.elements.randomize.checked;
    playerNum = Number(e.target.elements.playernum.value);
    startingUnits = Number(e.target.elements.startingunits.value);
    symmetry = e.target.elements.symmetry.checked;

    spawnRanges = initialSpawnRanges.map(val => val);
    let mult = 1.0;
    switch(e.target.spawnheaviness.value) {
        case 'vl':
            mult = 0.2;
            break;
        case 'l':
            mult = 0.5;
            break;
        case 'h':
            mult = 2.0;
            break;
        case 'vh':
            mult = 5.0;
            break;
        default:
            break;
    }
    spawnRanges.forEach(range => {
        range.min = Math.floor(range.min * mult);
        range.max = Math.floor(range.max * mult);
    });

    //store settings in localstorage so they are kept for future sessions
    localStorage.setItem('territory_sp_settings',JSON.stringify({
        dimension,
        randomizeStartingLocations,
        playerNum,
        startingUnits,
        symmetry,
        spawnheaviness:e.target.spawnheaviness.value
    }));

    e.target.style.display = 'none';
    StartGame();
}

//initialize spawnTimer to loop spawning units
function StartSpawning() {
    spawnTimer = setInterval(()=>{
        grid.forEach(row => {
            row.forEach(cell => {
                if(cell.controllingPlayer !== 0) {
                    cell.spawn();
                }
            });
        });
    },5000);
}

//pauses or unpauses timers and inputs
function TogglePause() {
    if(!gameRunning && grid.length) {
        //unpause
        gameRunning = true;
        AITimers = [];
        players.forEach(player => {
            const timer = player.getAILogic();
            if(timer) {
                AITimers.push(timer);
            }
        });
        StartSpawning();
        document.querySelector('#pausebutton').textContent = 'Pause';
    } else if(gameRunning) {
        //pause
        gameRunning = false;
        StopSelecting();
        AITimers.forEach(timer => {
            clearInterval(timer);
        }); 
        AITimers = [];
        clearInterval(spawnTimer);
        spawnTimer = 0;
        document.querySelector('#pausebutton').textContent = 'Unpause';
    }
}

//function that disposes select mode
function StopSelecting() {
    attackableCells.forEach(cell => {
        cell.domCell.classList.remove('attackable');
    });
    movableCells.forEach(cell => {
        cell.domCell.classList.remove('movable');
    });
    if(selectingCell) { selectingCell.domCell.classList.remove('selected'); }

    selectingCell = null;
    attackableCells = [];
    movableCells = [];
}

//end timers and handle game ending
function EndGame(winningPlayerNumber) {
    clearInterval(spawnTimer);
    AITimers.forEach(timer => {
        clearInterval(timer);
    });
    AITimers = [];

    grid = [];

    gameRunning = false;

    if(winningPlayerNumber) {
        console.log('Player ' + winningPlayerNumber + ' won!');
    }

    document.querySelector('#pausebutton').style.display = "none";
    document.querySelector('#newgamebutton').style.display = "initial";
}

//sets settings form values to saved settings
function LoadSettings() {
    const settings = JSON.parse(localStorage.getItem('territory_sp_settings'));
    if(settings) {
        if(settings.dimension) {
            document.querySelector('#dimension').value = settings.dimension;
        }
        document.querySelector('#randomizecheckbox').checked = settings.randomizeStartingLocations;
        if(settings.playerNum) {
            document.querySelector('#playernum').value = settings.playerNum;
            document.querySelector('#playernum').onchange();
        }
        if(settings.startingUnits) {
            document.querySelector('#startingunits').value = settings.startingUnits;
        }
        document.querySelector('#symmetrycheckbox').checked = settings.symmetry;
        if(settings.spawnheaviness) {
            document.querySelector('#spawnheaviness').value = settings.spawnheaviness;
        }
    }
}

document.querySelector('#gameoptions').onsubmit = GameStartFormSubmit;
LoadSettings();
